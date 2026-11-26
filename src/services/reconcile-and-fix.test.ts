import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { getJournalEntry } from '@data/journal-queries';
import { getReviewLine } from '@data/review-repository';
import { asCents } from '@shared/money';
import { getBankView } from './get-bank-view';
import { getTransaction } from './get-transaction';
import { moveEntries, moveEntryToAccount } from './fix-entry';
import { listTransactions } from './list-transactions';
import { postLineToAccount, postSplitLine } from './post-line';
import { checkReconcile, finishReconcile } from './reconcile';
import { day, reviewBooks } from './test-review-books';
import { undoPost } from './undo-post';

let books: ReturnType<typeof reviewBooks>;
beforeEach(() => {
  books = reviewBooks();
});
afterEach(() => {
  books.ctx.close();
});

const post = (id: string, code: string, tax: string | null = null) => {
  const r = postLineToAccount(books.ctx, {
    lineId: id,
    accountId: books.acc(code),
    taxCodeId: tax,
    payeeId: null,
  });
  if (!r.ok) throw new Error(r.error);
  return r.value.entryId;
};
const balance = (code: string) =>
  sumLinesByAccount(books.ctx.db, { from: null, to: day('2026-12-31') }).find(
    (t) => t.accountId === books.acc(code),
  )?.total ?? 0;

describe('changing the account of a posted entry (spec 083)', () => {
  it('rebuilds the entry for the new account, with GST from its usual code, keeping its history', () => {
    const entryId = post(books.line('WESTPAC FEE', -1100), '5000', 'tax_gst');
    expect(balance('2200')).toBe(100);
    expect(moveEntryToAccount(books.ctx, entryId, books.acc('6010'))).toEqual({
      ok: true,
      value: undefined,
    });
    expect(balance('5000')).toBe(0);
    expect(balance('6010')).toBe(1100);
    expect(balance('2200')).toBe(0);
    const entry = getJournalEntry(books.ctx.db, entryId);
    expect(entry).toMatchObject({ id: entryId, memo: 'WESTPAC FEE', sourceKind: 'bank-line' });
    expect(getTransaction(books.ctx, entryId)?.history.map((h) => h.kind)).toEqual([
      'posted',
      'changed',
    ]);
  });

  it('moves several, each with its audit row, and reports the ones it cannot', () => {
    const a = post(books.line('A', -1000), '5000');
    const b = post(books.line('B', -2000), '5000');
    const split = books.line('C', -3000);
    postSplitLine(books.ctx, {
      lineId: split,
      payeeId: null,
      parts: [
        { accountId: books.acc('6060'), taxCodeId: null, amount: asCents(1000) },
        { accountId: books.acc('6110'), taxCodeId: null, amount: asCents(2000) },
      ],
    });
    const c = getReviewLine(books.ctx.db, split)?.entryId ?? '';
    const outcome = moveEntries(books.ctx, [a, b, c], books.acc('6110'));
    expect(outcome).toEqual({ moved: [a, b], failed: [{ entryId: c, reason: 'not-movable' }] });
    expect(
      listAudit(books.ctx.db, { table: 'journal_entry' }).filter((x) => x.kind === 'entry.change'),
    ).toHaveLength(2);
  });

  it('refuses a locked entry and a bank account as the new account', () => {
    const entryId = post(books.line('A', -1000, '2026-11-02'), '5000');
    expect(moveEntryToAccount(books.ctx, entryId, books.acc('1010'))).toEqual({
      ok: false,
      error: 'invalid',
    });
    books.ctx.db.prepare("UPDATE business SET lock_date = '2026-11-10'").run();
    expect(moveEntryToAccount(books.ctx, entryId, books.acc('6110'))).toEqual({
      ok: false,
      error: 'locked',
    });
  });

  it('Transactions says which rows can be moved', () => {
    post(books.line('A', -1000), '5000');
    const page = listTransactions(books.ctx, { period: 'all' });
    expect(page.ok && page.value.rows.map((r) => r.movable)).toEqual([true]);
  });
});

describe('reconciling (spec 085)', () => {
  it('balanced: the books hold the statement balance, and it can be finished', () => {
    const a = books.line('DEPOSIT', 500000, '2026-11-02');
    const b = books.line('BUNNINGS', -41260, '2026-11-04');
    post(a, '4000', 'tax_gst');
    post(b, '5000', 'tax_gst');
    const input = {
      bankAccountId: books.one,
      statementDate: day('2026-11-30'),
      statementBalance: asCents(458740),
    };
    expect(checkReconcile(books.ctx, input)).toMatchObject({
      ok: true,
      value: { booksBalance: 458740, difference: 0, waiting: [] },
    });
    expect(finishReconcile(books.ctx, input)).toEqual({ ok: true, value: { lines: 2 } });
    expect(getBankView(books.ctx).accounts.find((x) => x.id === books.one)?.reconciledTo).toBe(
      '2026-11-30',
    );
    expect(listAudit(books.ctx.db, { table: 'reconciliation' }).map((x) => x.kind)).toEqual([
      'reconcile.finish',
    ]);
  });

  it('a difference from a waiting line is explained by it, and cannot be finished', () => {
    post(books.line('DEPOSIT', 500000, '2026-11-02'), '4000');
    books.line('BUNNINGS', -41260, '2026-11-04');
    const input = {
      bankAccountId: books.one,
      statementDate: day('2026-11-30'),
      statementBalance: asCents(458740),
    };
    expect(checkReconcile(books.ctx, input)).toMatchObject({
      ok: true,
      value: {
        difference: -41260,
        explainedByWaiting: true,
        waiting: [{ description: 'BUNNINGS' }],
      },
    });
    expect(finishReconcile(books.ctx, input)).toEqual({ ok: false, error: 'difference' });
  });

  it('a difference from a line missing from the books is not explained by waiting lines', () => {
    post(books.line('DEPOSIT', 500000, '2026-11-02'), '4000');
    const input = {
      bankAccountId: books.one,
      statementDate: day('2026-11-30'),
      statementBalance: asCents(498500),
    };
    expect(checkReconcile(books.ctx, input)).toMatchObject({
      ok: true,
      value: { difference: -1500, explainedByWaiting: false, waiting: [] },
    });
  });

  it('a reconciled line cannot be undone, and a date before the last is refused', () => {
    const a = books.line('DEPOSIT', 500000, '2026-11-02');
    post(a, '4000');
    finishReconcile(books.ctx, {
      bankAccountId: books.one,
      statementDate: day('2026-11-30'),
      statementBalance: asCents(500000),
    });
    expect(undoPost(books.ctx, [a])).toEqual({ ok: false, error: 'reconciled' });
    expect(
      finishReconcile(books.ctx, {
        bankAccountId: books.one,
        statementDate: day('2026-11-15'),
        statementBalance: asCents(500000),
      }),
    ).toEqual({ ok: false, error: 'before-last' });
  });
});
