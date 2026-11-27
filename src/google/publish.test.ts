import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { getSheetLink, listSheetLinks } from '@data/sheet-link-repository';
import { parseCalendarDate } from '@shared/dates';
import { plainRequest } from '@shared/reports';
import type { PublishOutcome } from '@shared/sheets';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { createTestContext } from '@services/test-context';
import { createFakeGoogle, type FakeGoogle } from './fake-google';
import { DRIVE_FOLDER, publishWorkbook } from './publish';

let ctx: ReturnType<typeof createTestContext>;
let google: FakeGoogle;

beforeEach(async () => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
  google = createFakeGoogle({ path: null, now: () => '2026-11-23T01:00:00.000Z' });
  await google.connection.connect();
});
afterEach(() => {
  ctx.close();
});

const pl = { kind: 'report' as const, request: plainRequest('profit-and-loss') };
const transactions = {
  kind: 'transactions' as const,
  period: { choice: 'this-quarter' as const, from: null, to: null },
};

function publish(request: Parameters<typeof publishWorkbook>[1], asNew = false) {
  return publishWorkbook({ ctx, api: google.api, connected: true }, request, { asNew });
}

function published(outcome: PublishOutcome) {
  if (outcome.kind !== 'published') throw new Error(`not published: ${JSON.stringify(outcome)}`);
  return outcome;
}

function fileOf(linkId: string) {
  const link = getSheetLink(ctx.db, linkId);
  const file = google.files().find((f) => f.id === link?.fileId);
  if (link === null || file === undefined) throw new Error('no file');
  return { link, file };
}

describe('publishing a report to a new workbook (spec 110)', () => {
  it('makes the folder and a workbook named for the whole quarter, with the report and Ready formulas', async () => {
    const out = published(await publish(pl));
    expect(out).toMatchObject({
      title: 'Profit and loss · Oct–Dec 2026',
      isNew: true,
      changes: null,
    });
    const { link, file } = fileOf(out.linkId);
    expect(google.files().find((f) => f.folder)?.title).toBe(DRIVE_FOLDER);
    expect(file.tabs.map((t) => [t.title, t.key])).toEqual([
      ['Profit and loss', 'report'],
      ['Ready formulas', 'ready-formulas'],
    ]);
    // Pinned to the whole quarter, so publishing again in December updates this workbook.
    expect([link.from, link.to]).toEqual(['2026-10-01', '2026-12-31']);
    expect(google.cell(file.id, 'report', 0, 0)).toBe('Harbour Lane Joinery Pty Ltd');
    expect(google.cell(file.id, 'report', 0, 2)).toContain('A copy of the books');
    expect(google.cell(file.id, 'report', 0, 4)).toBe('Account');
    expect(listAudit(ctx.db).some((a) => a.kind === 'sheet.publish')).toBe(true);
  });

  it('publishes nothing, and says so, while Google is not connected', async () => {
    const out = await publishWorkbook({ ctx, api: google.api, connected: false }, pl, {
      asNew: false,
    });
    expect(out).toEqual({ kind: 'refused', reason: 'not-connected' });
    expect(google.files()).toEqual([]);
    expect(listSheetLinks(ctx.db)).toEqual([]);
  });

  it('the transactions workbook has a row per entry, with the Ref of each', async () => {
    const out = published(await publish(transactions));
    const { link, file } = fileOf(out.linkId);
    expect(out.title).toBe('Transactions · Oct–Dec 2026');
    const rows = Object.keys(link.publishedValues);
    expect(rows.length).toBeGreaterThan(10);
    expect(google.cell(file.id, 'transactions', 0, 4)).toBe('Date');
    expect(google.cell(file.id, 'transactions', 7, 5)).toMatch(/^ent_/);
  });
});

describe('publishing again into the same workbook (spec 111)', () => {
  it('updates the same file in place and keeps his own tab and his own column', async () => {
    const first = published(await publish(pl));
    const { file } = fileOf(first.linkId);
    // He adds a tab of his own, and writes in column H of the app's tab.
    file.tabs.push({
      sheetId: 77,
      title: 'My workings',
      key: null,
      protectionIds: [],
      cells: { A1: 'mine' },
    });
    google.pretendEdit(file.id, 'report', 7, 5, 'my note', 'owner@example.com');

    const again = published(await publish(pl));
    expect(again).toMatchObject({ linkId: first.linkId, isNew: false, kept: ['My workings'] });
    expect(again.changes).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(google.files().filter((f) => !f.folder)).toHaveLength(1);
    expect(google.cell(file.id, 'My workings', 0, 0)).toBe('mine');
    expect(google.cell(file.id, 'report', 7, 5)).toBe('my note');
  });

  it('notices a workbook deleted in Drive, and publishes it as new when asked', async () => {
    const first = published(await publish(pl));
    google.pretendTrash(fileOf(first.linkId).file.id);
    expect(await publish(pl)).toEqual({
      kind: 'missing',
      linkId: first.linkId,
      title: 'Profit and loss · Oct–Dec 2026',
    });
    const fresh = published(await publish(pl, true));
    expect(fresh).toMatchObject({ linkId: first.linkId, isNew: true });
    expect(fileOf(fresh.linkId).file.trashed).toBe(false);
  });
});
