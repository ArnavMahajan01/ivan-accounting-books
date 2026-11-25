import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '@data/test-database';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';
import { seededRandom } from '@shared/ids';
import { ok } from '@shared/result';
import { fixtureText, type WestpacFixture } from '../../tests/fixtures/westpac/fixtures';
import { createHandlers, type HandlerDeps } from './handlers';
import { readStatementFile } from './statement-files';
import { staticBooks } from './test-books';

const clock = (() => {
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  const now = parseTimestamp('2026-11-23T01:00:00.000Z');
  if (!today.ok || !now.ok) throw new Error('bad test date');
  return fixedClock(today.value, now.value);
})();

let dir: string;
let chosen: string | null;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'import-handlers-'));
  chosen = null;
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fileOf(name: WestpacFixture): string {
  const path = join(dir, `${name}.ofx`);
  writeFileSync(path, fixtureText(name));
  return path;
}

function setup() {
  const store = createTestDatabase();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: store.db }, today.value);
  const onImport = vi.fn<NonNullable<HandlerDeps['onImport']>>();
  const handlers = createHandlers({
    app: { getVersion: () => '1.0.0', isPackaged: true },
    books: staticBooks(ok(store)),
    clock,
    random: seededRandom(11),
    files: { choose: () => Promise.resolve(chosen), read: readStatementFile },
    onImport,
  });
  return { handlers, onImport };
}

async function preview(h: ReturnType<typeof setup>['handlers'], path: string) {
  const result = await h['bank.previewFile']({ path });
  if (!result.ok || result.value.kind !== 'preview') throw new Error('no preview');
  return result.value.preview;
}

describe('the bank functions', () => {
  it('bank.list gives each account with its balance, and no statement before an import', async () => {
    const { handlers } = setup();
    const result = await handlers['bank.list']({});
    expect(result).toMatchObject({
      ok: true,
      value: {
        accounts: [
          { name: 'Business One ··4821', balance: 1864235, lastStatement: null, linesToReview: 0 },
          { name: 'Business Cash Reserve ··7730', balance: 2500000, linesToReview: 0 },
        ],
      },
    });
  });

  it('previews a chosen file, and says cancelled when the chooser is closed', async () => {
    const { handlers } = setup();
    expect(await handlers['bank.chooseAndPreview']({})).toEqual(ok({ kind: 'cancelled' }));
    chosen = fileOf('business-one-2-13-nov-2026');
    const result = await handlers['bank.chooseAndPreview']({});
    expect(result).toMatchObject({
      ok: true,
      value: { kind: 'preview', preview: { counts: { new: 11, duplicate: 0, rejected: 0 } } },
    });
  });

  it('imports a previewed file, and the To review count, Bank page and statement follow', async () => {
    const { handlers, onImport } = setup();
    expect(await handlers['review.getCount']({})).toEqual(ok({ count: 0 }));
    const shown = await preview(handlers, fileOf('business-one-2-13-nov-2026'));
    const saved = await handlers['bank.commitImport']({ previewId: shown.previewId });
    expect(saved).toEqual(
      ok({
        kind: 'imported',
        added: 11,
        skipped: 0,
        rejected: 0,
        accountName: 'Business One ··4821',
      }),
    );
    expect(await handlers['review.getCount']({})).toEqual(ok({ count: 11 }));
    expect(await handlers['bank.list']({})).toMatchObject({
      value: {
        accounts: [
          {
            linesToReview: 11,
            lastStatement: { balance: 1491745, date: '2026-11-13' },
          },
          { linesToReview: 0 },
        ],
      },
    });
    // Counts are reported, and nothing a statement holds.
    expect(onImport.mock.calls).toEqual([
      ['previewed', { new: 11, duplicate: 0, rejected: 0 }],
      ['imported', { added: 11, skipped: 0, rejected: 0 }],
    ]);
    expect(JSON.stringify(onImport.mock.calls)).not.toContain('RENT');
  });

  it('will not import the same preview twice', async () => {
    const { handlers } = setup();
    const shown = await preview(handlers, fileOf('business-one-2-13-nov-2026'));
    await handlers['bank.commitImport']({ previewId: shown.previewId });
    expect(await handlers['bank.commitImport']({ previewId: shown.previewId })).toEqual(
      ok({ kind: 'refused', reason: 'no-such-preview' }),
    );
    expect(await handlers['review.getCount']({})).toEqual(ok({ count: 11 }));
  });

  it('says nothing is new when a fresh preview of the same file is confirmed', async () => {
    const { handlers } = setup();
    const path = fileOf('business-one-2-13-nov-2026');
    const first = await preview(handlers, path);
    const again = await preview(handlers, path);
    await handlers['bank.commitImport']({ previewId: first.previewId });
    expect(await handlers['bank.commitImport']({ previewId: again.previewId })).toEqual(
      ok({ kind: 'refused', reason: 'nothing-new' }),
    );
    expect(await handlers['review.getCount']({})).toEqual(ok({ count: 11 }));
  });

  it('takes the last import back, once, and the count and the offer follow', async () => {
    const { handlers, onImport } = setup();
    const shown = await preview(handlers, fileOf('business-one-2-13-nov-2026'));
    await handlers['bank.commitImport']({ previewId: shown.previewId });
    const listed = await handlers['bank.list']({});
    const batchId = listed.ok ? (listed.value.accounts[0]?.undoableImport?.batchId ?? '') : '';
    expect(batchId).toMatch(/^imp_/);
    expect(await handlers['bank.undoImport']({ batchId })).toEqual(
      ok({ kind: 'undone', removed: 11, fileName: 'business-one-2-13-nov-2026.ofx' }),
    );
    expect(await handlers['review.getCount']({})).toEqual(ok({ count: 0 }));
    expect(await handlers['bank.list']({})).toMatchObject({
      value: { accounts: [{ undoableImport: null, lastStatement: null }, {}] },
    });
    expect(await handlers['bank.undoImport']({ batchId })).toEqual(
      ok({ kind: 'refused', reason: 'not-found' }),
    );
    expect(onImport.mock.calls.at(-1)).toEqual(['undone', { removed: 11 }]);
  });

  it('refuses a preview it never made', async () => {
    const { handlers } = setup();
    expect(await handlers['bank.commitImport']({ previewId: 'pre_nothere' })).toEqual(
      ok({ kind: 'refused', reason: 'no-such-preview' }),
    );
  });

  it('refuses files for the right reason, with no content in the answer', async () => {
    const { handlers } = setup();
    expect(
      await handlers['bank.previewFile']({ path: fileOf('other-account-16-nov-2026') }),
    ).toEqual(ok({ kind: 'refused', reason: 'unknown-account', lastFour: '9999' }));
    expect(await handlers['bank.previewFile']({ path: fileOf('empty') })).toEqual(
      ok({ kind: 'refused', reason: 'empty', lastFour: null }),
    );
    expect(await handlers['bank.previewFile']({ path: join(dir, 'nothing.ofx') })).toEqual(
      ok({ kind: 'refused', reason: 'unreadable-file', lastFour: null }),
    );
    const notAStatement = join(dir, 'notes.txt');
    writeFileSync(notAStatement, 'my secret notes: hunter2');
    const refused = await handlers['bank.previewFile']({ path: notAStatement });
    expect(refused).toEqual(ok({ kind: 'refused', reason: 'unknown-format', lastFour: null }));
    expect(JSON.stringify(refused)).not.toContain('hunter2');
  });

  it('forgets a preview when the books change, so it cannot be saved into other books', async () => {
    const { handlers } = setup();
    const shown = await preview(handlers, fileOf('business-one-2-13-nov-2026'));
    await handlers['sample.clear']({});
    expect(await handlers['bank.commitImport']({ previewId: shown.previewId })).toEqual(
      ok({ kind: 'refused', reason: 'no-such-preview' }),
    );
  });
});
