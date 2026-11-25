import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countAudit, listAudit } from '@data/audit-repository';
import { integrityProblems } from '@data/database';
import {
  countLinesByStatus,
  listImportBatches,
  summariseLinesToReview,
} from '@data/statement-repository';
import { parseCalendarDate } from '@shared/dates';
import type { RandomSource } from '@shared/ids';
import { fixtureText, type WestpacFixture } from '../../tests/fixtures/westpac/fixtures';
import { getBankView } from './get-bank-view';
import { commitImport, previewImport } from './import-file';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';
import { undoImport } from './undo-import';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
});
afterEach(() => {
  ctx.close();
});

function importFile(name: WestpacFixture) {
  const prepared = previewImport(ctx, { fileName: `${name}.ofx`, text: fixtureText(name) });
  if (!prepared.ok) throw new Error(prepared.error.reason);
  const saved = commitImport(ctx, prepared.value);
  if (!saved.ok) throw new Error(saved.error);
  return saved.value.batch;
}

const A = 'business-one-2-13-nov-2026';
const B = 'business-one-9-20-nov-2026';

describe('taking an import back', () => {
  it('removes the latest import with every line it added, and the same file imports as new again', () => {
    const batch = importFile(A);
    const result = undoImport(ctx, batch.id);
    expect(result).toEqual({ ok: true, value: { removed: 11, fileName: `${A}.ofx` } });
    expect(listImportBatches(ctx.db, 10)).toEqual([]);
    expect(summariseLinesToReview(ctx.db).count).toBe(0);
    expect(integrityProblems(ctx.db)).toEqual([]);
    const again = previewImport(ctx, { fileName: 'x.ofx', text: fixtureText(A) });
    expect(again.ok && again.value.checked.filter((c) => c.status === 'new')).toHaveLength(11);
  });

  it('writes one audit row with the batch, and no line descriptions', () => {
    const batch = importFile(A);
    const before = countAudit(ctx.db);
    undoImport(ctx, batch.id);
    expect(countAudit(ctx.db)).toBe(before + 1);
    const [audit] = listAudit(ctx.db, { table: 'import_batch' }).filter(
      (a) => a.kind === 'import.undo',
    );
    expect(audit).toMatchObject({ before: { id: batch.id, newCount: 11 }, after: null });
    expect(JSON.stringify(audit)).not.toContain('WORKSHOP RENT');
  });

  it('can take back the newest import, then the one before it, but not an older one first', () => {
    const first = importFile(A);
    const second = importFile(B);
    expect(undoImport(ctx, first.id)).toEqual({ ok: false, error: 'not-the-latest' });
    expect(listImportBatches(ctx.db, 10)).toHaveLength(2);
    expect(undoImport(ctx, second.id)).toMatchObject({ ok: true, value: { removed: 7 } });
    expect(undoImport(ctx, first.id)).toMatchObject({ ok: true, value: { removed: 11 } });
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(0);
  });

  it('counts the file imported last as the latest, even when it covers earlier days', () => {
    const later = importFile(B);
    const earlier = importFile(A);
    expect(undoImport(ctx, later.id)).toEqual({ ok: false, error: 'not-the-latest' });
    expect(undoImport(ctx, earlier.id).ok).toBe(true);
    expect(undoImport(ctx, later.id).ok).toBe(true);
  });

  it('refuses once any of its lines has been used, and changes nothing', () => {
    const batch = importFile(A);
    ctx.db
      .prepare(
        "UPDATE statement_line SET status = 'posted' WHERE batch_id = ? AND rowid = (SELECT MIN(rowid) FROM statement_line WHERE batch_id = ?)",
      )
      .run(batch.id, batch.id);
    const audit = countAudit(ctx.db);
    expect(undoImport(ctx, batch.id)).toEqual({ ok: false, error: 'lines-already-used' });
    expect(listImportBatches(ctx.db, 10)).toHaveLength(1);
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(10);
    expect(countAudit(ctx.db)).toBe(audit);
  });

  it('says so for an import that does not exist, or was already taken back', () => {
    const batch = importFile(A);
    expect(undoImport(ctx, 'imp_nothere')).toEqual({ ok: false, error: 'not-found' });
    undoImport(ctx, batch.id);
    expect(undoImport(ctx, batch.id)).toEqual({ ok: false, error: 'not-found' });
  });

  it('removes nothing when it fails part way through', () => {
    const batch = importFile(A);
    const audit = countAudit(ctx.db);
    const failing: RandomSource = {
      bytes() {
        throw new Error('forced failure');
      },
    };
    // The audit row is written after the lines are removed, so its id fails the whole undo.
    expect(() => undoImport({ ...ctx, random: failing }, batch.id)).toThrow('forced failure');
    expect(listImportBatches(ctx.db, 10)).toHaveLength(1);
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(11);
    expect(countAudit(ctx.db)).toBe(audit);
  });
});

describe('the Bank page’s last import', () => {
  const view = () => getBankView(ctx).accounts.map((a) => a.undoableImport);

  it('names the file last imported for each account while it can be taken back', () => {
    expect(view()).toEqual([null, null]);
    const batch = importFile(A);
    expect(view()[0]).toEqual({
      batchId: batch.id,
      fileName: `${A}.ofx`,
      added: 11,
      period: { from: '2026-11-02', to: '2026-11-13' },
    });
    expect(view()[1]).toBeNull();
    importFile(B);
    expect(view()[0]).toMatchObject({ added: 7, period: { from: '2026-11-09', to: '2026-11-20' } });
  });

  it('stops offering it once a line has been used, and after it is taken back', () => {
    const batch = importFile(A);
    undoImport(ctx, batch.id);
    expect(view()).toEqual([null, null]);
    const again = importFile(A);
    ctx.db
      .prepare("UPDATE statement_line SET status = 'excluded' WHERE batch_id = ?")
      .run(again.id);
    expect(view()[0]).toBeNull();
  });
});
