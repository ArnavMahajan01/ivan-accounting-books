import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { countAudit, listAudit } from '@data/audit-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { listBankAccounts } from '@data/bank-account-repository';
import { integrityProblems } from '@data/database';
import {
  countLinesByStatus,
  listImportBatches,
  listLinesInBatch,
  summariseLinesToReview,
} from '@data/statement-repository';
import { parseCalendarDate } from '@shared/dates';
import type { RandomSource } from '@shared/ids';
import { fixtureText, type WestpacFixture } from '../../tests/fixtures/westpac/fixtures';
import { hugeOfx } from '../../tests/fixtures/westpac/huge-ofx';
import { commitImport, importPreviewView, previewImport, type PreparedImport } from './import-file';
import { deactivateBankAccount } from './manage-bank-accounts';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

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

const NAMES: Record<WestpacFixture, string> = {
  'business-one-2-13-nov-2026': 'Westpac_4821_2-13Nov2026.ofx',
  'business-one-2-13-nov-2026-xml': 'Westpac_4821_2-13Nov2026_xml.ofx',
  'business-one-9-20-nov-2026': 'Westpac_4821_9-20Nov2026.ofx',
  'business-one-16-23-nov-2026-bad-date': 'Westpac_4821_16-23Nov2026.ofx',
  'business-one-no-transactions': 'Westpac_4821_none.ofx',
  'cash-reserve-jul-nov-2026': 'Westpac_7730_Jul-Nov2026.ofx',
  'business-one-21-23-nov-2026-demo-4': 'Westpac_4821_21-23Nov2026.ofx',
  'cash-reserve-21-23-nov-2026-demo-4': 'Westpac_7730_21-23Nov2026.ofx',
  'other-account-16-nov-2026': 'Westpac_9999_16Nov2026.ofx',
  empty: 'empty.ofx',
};

function prepare(name: WestpacFixture): PreparedImport {
  const result = previewImport(ctx, { fileName: NAMES[name], text: fixtureText(name) });
  if (!result.ok) throw new Error(`refused: ${result.error.reason}`);
  return result.value;
}

function importFile(name: WestpacFixture) {
  const result = commitImport(ctx, prepare(name));
  if (!result.ok) throw new Error(`not saved: ${result.error}`);
  return result.value;
}

const day = (text: string) => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(text);
  return parsed.value;
};

function ledgerBalance(code: string, to: string): number {
  const account = getAccountByCode(ctx.db, code);
  const total = sumLinesByAccount(ctx.db, { from: null, to: day(to) }).find(
    (t) => t.accountId === account?.id,
  );
  return total?.total ?? 0;
}

describe('previewing a file', () => {
  it('says what a clean file would do, and writes nothing', () => {
    const audit = countAudit(ctx.db);
    const prepared = prepare('business-one-2-13-nov-2026');
    const view = importPreviewView(prepared, 'pre_1');
    expect(view).toMatchObject({
      fileName: 'Westpac_4821_2-13Nov2026.ofx',
      account: { name: 'Business One ··4821', lastFour: '4821' },
      period: { from: '2026-11-02', to: '2026-11-13' },
      counts: { new: 11, duplicate: 0, rejected: 0 },
      balance: { kind: 'first-file', closing: 1491745, closingDate: '2026-11-13' },
    });
    expect(view.lines).toHaveLength(11);
    expect(view.lines[0]).toMatchObject({
      status: 'new',
      date: '2026-11-02',
      description: 'WORKSHOP RENT MARSH PROPERTY GROUP',
      amount: -330000,
    });
    expect(listImportBatches(ctx.db, 10)).toEqual([]);
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(0);
    expect(countAudit(ctx.db)).toBe(audit);
  });

  it('matches the account from the last four digits in the file', () => {
    const view = importPreviewView(prepare('cash-reserve-jul-nov-2026'), 'pre_1');
    expect(view.account).toMatchObject({ name: 'Business Cash Reserve ··7730' });
    expect(view.counts.new).toBe(3);
  });

  it('refuses a file for an account that is not his, naming the last four digits', () => {
    expect(
      previewImport(ctx, { fileName: 'x.ofx', text: fixtureText('other-account-16-nov-2026') }),
    ).toEqual({ ok: false, error: { reason: 'unknown-account', lastFour: '9999' } });
    expect(listImportBatches(ctx.db, 10)).toEqual([]);
  });

  it('refuses a deactivated account, an empty file, a statement with nothing in it and a stranger', () => {
    const one = listBankAccounts(ctx.db).find((b) => b.lastFour === '4821');
    if (one === undefined) throw new Error('no account');
    const text = fixtureText('business-one-2-13-nov-2026');
    expect(previewImport(ctx, { fileName: 'x.ofx', text: '' })).toMatchObject({
      error: { reason: 'empty' },
    });
    expect(
      previewImport(ctx, { fileName: 'x.ofx', text: fixtureText('business-one-no-transactions') }),
    ).toMatchObject({ error: { reason: 'no-transactions' } });
    expect(previewImport(ctx, { fileName: 'x.csv', text: 'a,b,c\n1,2,3\n' })).toMatchObject({
      error: { reason: 'unknown-format' },
    });
    expect(deactivateBankAccount(ctx, one.id).ok).toBe(true);
    expect(previewImport(ctx, { fileName: 'x.ofx', text })).toEqual({
      ok: false,
      error: { reason: 'inactive-account', lastFour: '4821' },
    });
  });

  it('keeps only the file’s name, never the folder it was in', () => {
    const result = previewImport(ctx, {
      fileName: '/Users/someone/Downloads/Westpac_4821.ofx',
      text: fixtureText('business-one-2-13-nov-2026'),
    });
    expect(result.ok && result.value.fileName).toBe('Westpac_4821.ofx');
  });

  it('reads the same lines from the XML form of a file as from the text form', () => {
    const text = importPreviewView(prepare('business-one-2-13-nov-2026'), 'a').lines;
    const xml = importPreviewView(prepare('business-one-2-13-nov-2026-xml'), 'b').lines;
    expect(xml).toEqual(text);
  });
});

describe('Home after an import', () => {
  it('lists reviewing the bank lines as a job, with how many and the oldest day', async () => {
    const { getHomeSummary } = await import('./get-home-summary');
    importFile('business-one-2-13-nov-2026');
    const home = getHomeSummary(ctx);
    expect(home.linesToReview).toEqual({ count: 11, oldest: '2026-11-02' });
    expect(home.nextSteps).toEqual([
      { id: 'review-lines', state: 'todo', count: 11, oldest: '2026-11-02' },
    ]);
    expect(home.upToDate).toBe(false);
  });
});

describe('importing a file', () => {
  it('saves the lines to review, in one batch, with an audit row and no description in it', () => {
    const summary = importFile('business-one-2-13-nov-2026');
    expect(summary).toMatchObject({ added: 11, skipped: 0, rejected: 0 });
    const lines = listLinesInBatch(ctx.db, summary.batch.id);
    expect(lines).toHaveLength(11);
    expect(lines.every((l) => l.status === 'to-review')).toBe(true);
    expect(lines[0]).toMatchObject({ key: 'id:202611020001', amount: -330000 });
    expect(summariseLinesToReview(ctx.db)).toEqual({ count: 11, oldest: '2026-11-02' });
    expect(summary.batch).toMatchObject({
      fileName: 'Westpac_4821_2-13Nov2026.ofx',
      periodFrom: '2026-11-02',
      periodTo: '2026-11-13',
      newCount: 11,
      closingBalance: { amount: 1491745, date: '2026-11-13' },
    });
    expect(summary.batch.fileHash).toMatch(/^[0-9a-f]{64}$/);
    const [audit] = listAudit(ctx.db, { table: 'import_batch' });
    expect(audit).toMatchObject({ kind: 'import.commit', before: null });
    expect(JSON.stringify(audit?.after)).not.toContain('WORKSHOP RENT');
    expect(integrityProblems(ctx.db)).toEqual([]);
  });

  it('adds no second copy when the same file is imported again', () => {
    importFile('business-one-2-13-nov-2026');
    const again = prepare('business-one-2-13-nov-2026');
    expect(importPreviewView(again, 'p').counts).toEqual({ new: 0, duplicate: 11, rejected: 0 });
    expect(commitImport(ctx, again)).toEqual({ ok: false, error: 'nothing-new' });
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(11);
    expect(listImportBatches(ctx.db, 10)).toHaveLength(1);
  });

  it('adds no second copy when a preview is committed twice', () => {
    const prepared = prepare('business-one-2-13-nov-2026');
    expect(commitImport(ctx, prepared).ok).toBe(true);
    expect(commitImport(ctx, prepared)).toEqual({ ok: false, error: 'nothing-new' });
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(11);
  });

  it('adds only the new lines of an overlapping file, and the balance matches', () => {
    importFile('business-one-2-13-nov-2026');
    const prepared = prepare('business-one-9-20-nov-2026');
    const view = importPreviewView(prepared, 'p');
    expect(view.counts).toEqual({ new: 7, duplicate: 6, rejected: 0 });
    expect(view.balance).toEqual({ kind: 'match', closing: 1864235, closingDate: '2026-11-20' });
    expect(view.lines.flatMap((l) => (l.status === 'duplicate' ? [l.date] : []))).toEqual([
      '2026-11-09',
      '2026-11-09',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-13',
    ]);
    const summary = commitImport(ctx, prepared);
    expect(summary).toMatchObject({ ok: true, value: { added: 7, skipped: 6 } });
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(18);
  });

  it('gives the problem file’s difference, and says the line it could not read is the reason', () => {
    importFile('business-one-2-13-nov-2026');
    importFile('business-one-9-20-nov-2026');
    const view = importPreviewView(prepare('business-one-16-23-nov-2026-bad-date'), 'p');
    expect(view.counts).toEqual({ new: 3, duplicate: 6, rejected: 1 });
    expect(view.balance).toMatchObject({
      kind: 'difference',
      closing: 2089835,
      expected: 2099835,
      difference: -10000,
      explainedByRejected: true,
    });
    const rejected = view.lines.find((l) => l.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: 'impossible-date',
      value: '20261131',
      amount: -10000,
      position: 7,
    });
    // The rejected line sits in the file's order, between the good lines.
    expect(view.lines.map((l) => l.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const summary = importFile('business-one-16-23-nov-2026-bad-date');
    expect(summary).toMatchObject({ added: 3, skipped: 6, rejected: 1 });
    expect(summary.batch.rejectedCount).toBe(1);
  });

  it('cannot check a file that is older than the files already imported, and says so', () => {
    importFile('business-one-9-20-nov-2026');
    const view = importPreviewView(prepare('business-one-2-13-nov-2026'), 'p');
    expect(view.counts).toEqual({ new: 5, duplicate: 6, rejected: 0 });
    expect(view.balance.kind).toBe('no-starting-point');
  });

  it('treats the XML form of a file as the same transactions', () => {
    importFile('business-one-2-13-nov-2026');
    const xml = importPreviewView(prepare('business-one-2-13-nov-2026-xml'), 'p');
    expect(xml.counts).toEqual({ new: 0, duplicate: 11, rejected: 0 });
  });

  it('keeps each account’s lines apart', () => {
    importFile('business-one-2-13-nov-2026');
    expect(importPreviewView(prepare('cash-reserve-jul-nov-2026'), 'p').counts.new).toBe(3);
  });

  it('agrees with the sample books: the files start and end where the ledger does', () => {
    const first = importFile('business-one-2-13-nov-2026');
    const second = importFile('business-one-9-20-nov-2026');
    expect(first.batch.openingBalance).toBe(ledgerBalance('1000', '2026-11-01'));
    expect(second.batch.closingBalance?.amount).toBe(ledgerBalance('1000', '2026-11-20'));
    expect(second.batch.closingBalance?.amount).toBe(1864235);
    const reserve = importFile('cash-reserve-jul-nov-2026');
    expect(reserve.batch.closingBalance?.amount).toBe(ledgerBalance('1010', '2026-11-20'));
    expect(reserve.batch.openingBalance).toBe(0);
  });

  it('writes nothing at all when it fails part way through', () => {
    const prepared = prepare('business-one-2-13-nov-2026');
    const audit = countAudit(ctx.db);
    let calls = 0;
    const flaky: RandomSource = {
      bytes(count) {
        calls += 1;
        // The batch's id is the first call and each line's the next: fail on the fifth line.
        if (calls === 6) throw new Error('forced failure');
        return ctx.random.bytes(count);
      },
    };
    expect(() => commitImport({ ...ctx, random: flaky }, prepared)).toThrow('forced failure');
    expect(listImportBatches(ctx.db, 10)).toEqual([]);
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(0);
    expect(countAudit(ctx.db)).toBe(audit);
    // And the same file imports cleanly afterwards.
    expect(commitImport(ctx, prepared)).toMatchObject({ ok: true, value: { added: 11 } });
  });

  it('refuses a preview for an account that has gone inactive since', () => {
    const prepared = prepare('business-one-2-13-nov-2026');
    deactivateBankAccount(ctx, prepared.account.id);
    expect(commitImport(ctx, prepared)).toEqual({ ok: false, error: 'account-gone' });
    expect(countLinesByStatus(ctx.db, 'to-review')).toBe(0);
  });

  it('handles 10,000 lines, and then sees every one of them as already imported', () => {
    const text = hugeOfx(10_000);
    const started = performance.now();
    const first = previewImport(ctx, { fileName: 'big.ofx', text });
    if (!first.ok) throw new Error(first.error.reason);
    expect(commitImport(ctx, first.value)).toMatchObject({ ok: true, value: { added: 10_000 } });
    const second = previewImport(ctx, { fileName: 'big.ofx', text });
    if (!second.ok) throw new Error(second.error.reason);
    expect(importPreviewView(second.value, 'p').counts).toEqual({
      new: 0,
      duplicate: 10_000,
      rejected: 0,
    });
    expect(performance.now() - started).toBeLessThan(10_000);
  });
});
