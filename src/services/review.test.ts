// Folder 06: posting bank lines from To review. Invented lines for the invented sample business.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { listAudit } from '@data/audit-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { listContacts } from '@data/contact-repository';
import { integrityProblems } from '@data/database';
import {
  countJournalEntries,
  countUnbalancedEntries,
  getJournalEntry,
} from '@data/journal-queries';
import { getReviewLine } from '@data/review-repository';
import { insertImportBatch, insertStatementLine } from '@data/statement-repository';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents } from '@shared/money';
import type { ReviewAction } from '@shared/views';
import { addBankAccount } from './add-bank-account';
import { getReviewView } from './list-review';
import { postEntry } from './post-journal';
import { matchLine, postLineToAccount, postLines, postSplitLine, postTransfer } from './post-line';
import { savePayeeFromLine, undoSavePayee } from './save-payee';
import { getContactByName } from '@data/contact-repository';
import { setupBusiness } from './setup-business';
import { createTestContext } from './test-context';
import { undoPost } from './undo-post';

let ctx: ReturnType<typeof createTestContext>;
let one: Id<'bnk'>;
let reserve: Id<'bnk'>;
let lineCount = 0;

const day = (text: string): CalendarDate => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(text);
  return parsed.value;
};

function acc(code: string): Id<'acc'> {
  const account = getAccountByCode(ctx.db, code);
  if (account === null) throw new Error(code);
  return account.id;
}

beforeEach(() => {
  lineCount = 0;
  ctx = createTestContext();
  setupBusiness(ctx, {
    name: 'Harbour Lane Joinery Pty Ltd',
    abn: '18 123 456 789',
    gstRegistered: true,
    gstBasis: 'cash',
    basFrequency: 'quarterly',
  });
  const first = addBankAccount(ctx, {
    name: 'Business One ··4821',
    bank: 'Westpac',
    lastFour: '4821',
    ledgerAccountId: acc('1000'),
  });
  const second = addBankAccount(ctx, {
    name: 'Business Cash Reserve ··7730',
    bank: 'Westpac',
    lastFour: '7730',
    ledgerAccountId: acc('1010'),
  });
  if (!first.ok || !second.ok) throw new Error('bank accounts');
  one = first.value.id;
  reserve = second.value.id;
  for (const [id, account] of [
    ['imp_one', one],
    ['imp_reserve', reserve],
  ] as const) {
    insertImportBatch(ctx.db, {
      id,
      bankAccountId: account,
      fileName: 'invented.ofx',
      format: 'ofx',
      fileHash: '0'.repeat(64),
      periodFrom: day('2026-11-01'),
      periodTo: day('2026-11-30'),
      newCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      openingBalance: null,
      closingBalance: null,
      importedAt: ctx.clock.now(),
    });
  }
});
afterEach(() => {
  ctx.close();
});

/** Adds a waiting line and gives its id. */
function line(description: string, amount: number, date = '2026-11-04', account = one): string {
  lineCount += 1;
  const id = `stl_t${String(lineCount)}` as Id<'stl'>;
  insertStatementLine(ctx.db, {
    id,
    bankAccountId: account,
    batchId: account === one ? 'imp_one' : 'imp_reserve',
    date: day(date),
    description,
    amount: asCents(amount),
    balance: null,
    key: `key${String(lineCount)}`,
    status: 'to-review',
    createdAt: ctx.clock.now(),
  });
  return id;
}

function balance(code: string): number {
  const id = acc(code);
  return (
    sumLinesByAccount(ctx.db, { from: null, to: day('2026-12-31') }).find((t) => t.accountId === id)
      ?.total ?? 0
  );
}

function booksSound() {
  expect(countUnbalancedEntries(ctx.db)).toBe(0);
  expect(integrityProblems(ctx.db)).toEqual([]);
  expect(ctx.db.pragma('foreign_key_check')).toEqual([]);
}

const status = (id: string) => getReviewLine(ctx.db, id)?.status;

describe('the GST and transfers accounts', () => {
  it('are set up with the books, by role', () => {
    expect(accountForRole(ctx.db, 'gst')).toBe(acc('2200'));
    expect(accountForRole(ctx.db, 'transfers')).toBe(acc('1090'));
  });
});

describe('posting one line (spec 069)', () => {
  it('makes a balanced entry with GST from the code, and links the line', () => {
    const id = line('BUNNINGS 4532', -41260);
    const result = postLineToAccount(ctx, {
      lineId: id,
      accountId: acc('5000'),
      taxCodeId: 'tax_gst',
      payeeId: null,
    });
    expect(result.ok).toBe(true);
    const posted = getReviewLine(ctx.db, id);
    expect(posted).toMatchObject({ status: 'posted' });
    const entry = getJournalEntry(ctx.db, posted?.entryId ?? '');
    expect(entry).toMatchObject({ sourceKind: 'bank-line', sourceId: id, memo: 'BUNNINGS 4532' });
    expect(balance('5000')).toBe(37509);
    expect(balance('2200')).toBe(3751);
    expect(balance('1000')).toBe(-41260);
    expect(listAudit(ctx.db, { table: 'statement_line', rowId: id })).toMatchObject([
      { kind: 'line.post' },
    ]);
    booksSound();
  });

  it('uses the account’s usual GST code when none is chosen', () => {
    const id = line('WESTPAC ACCOUNT FEE', -1500);
    postLineToAccount(ctx, { lineId: id, accountId: acc('6010'), taxCodeId: null, payeeId: null });
    const entry = getJournalEntry(ctx.db, getReviewLine(ctx.db, id)?.entryId ?? '');
    expect(entry?.lines.map((l) => [l.amount, l.taxCodeId])).toEqual([
      [1500, 'tax_inp'],
      [-1500, null],
    ]);
  });

  it.each([
    ['money in with GST', 330000, '4000', 'tax_gst', -300000, -30000],
    ['GST-free', -5000, '5000', 'tax_fre', 5000, 0],
    ['outside GST (BAS excluded)', -100000, '3200', 'tax_nt', 100000, 0],
    ['a refund to an expense account', 5500, '5000', 'tax_gst', -5000, -500],
  ])('%s', (_name, amount, code, tax, expected, gst) => {
    const id = line('INVENTED', amount);
    expect(
      postLineToAccount(ctx, { lineId: id, accountId: acc(code), taxCodeId: tax, payeeId: null })
        .ok,
    ).toBe(true);
    expect(balance(code)).toBe(expected);
    expect(balance('2200')).toBe(gst);
    booksSound();
  });

  it('refuses to post the same line twice', () => {
    const id = line('BUNNINGS 4532', -41260);
    const input = { lineId: id, accountId: acc('5000'), taxCodeId: 'tax_gst', payeeId: null };
    expect(postLineToAccount(ctx, input).ok).toBe(true);
    expect(postLineToAccount(ctx, input)).toEqual({ ok: false, error: 'not-waiting' });
    expect(countJournalEntries(ctx.db)).toBe(1);
  });

  it('sends his own bank accounts and the transfers account to Transfer', () => {
    const id = line('TRANSFER', -2000);
    for (const code of ['1010', '1090']) {
      expect(
        postLineToAccount(ctx, {
          lineId: id,
          accountId: acc(code),
          taxCodeId: null,
          payeeId: null,
        }),
      ).toEqual({ ok: false, error: 'use-transfer' });
    }
    expect(status(id)).toBe('to-review');
  });

  it('refuses a locked period and changes nothing', () => {
    ctx.db.prepare("UPDATE business SET lock_date = '2026-11-30'").run();
    const id = line('BUNNINGS 4532', -41260);
    expect(
      postLineToAccount(ctx, {
        lineId: id,
        accountId: acc('5000'),
        taxCodeId: 'tax_gst',
        payeeId: null,
      }),
    ).toEqual({ ok: false, error: 'locked' });
    expect(status(id)).toBe('to-review');
    expect(countJournalEntries(ctx.db)).toBe(0);
  });
});

describe('posting many lines (spec 070)', () => {
  it('12 lines with one missing an account posts 11 and reports 1', () => {
    const actions: ReviewAction[] = Array.from({ length: 12 }, (_, i) => ({
      kind: 'account',
      lineId: line(`AMPOL ${String(i)}`, -(1000 + i)),
      accountId: i === 7 ? null : acc('6050'),
      taxCodeId: 'tax_gst',
      payeeId: null,
    }));
    const outcome = postLines(ctx, actions);
    expect(outcome.posted).toHaveLength(11);
    expect(outcome.failed).toEqual([{ lineId: actions[7]?.lineId, reason: 'needs-account' }]);
    expect(countJournalEntries(ctx.db)).toBe(11);
    booksSound();
  });

  it('one bad line does not block the rest', () => {
    const good = line('A', -1000);
    const gone = 'stl_missing';
    const outcome = postLines(ctx, [
      { kind: 'account', lineId: gone, accountId: acc('6050'), taxCodeId: null, payeeId: null },
      { kind: 'account', lineId: good, accountId: acc('6050'), taxCodeId: null, payeeId: null },
    ]);
    expect(outcome).toEqual({
      posted: [good],
      alsoPosted: [],
      failed: [{ lineId: gone, reason: 'not-found' }],
    });
  });
});

describe('a split line (spec 072)', () => {
  it('posts one line per part with its own GST', () => {
    const id = line('OFFICEWORKS 0412', -23645);
    const result = postSplitLine(ctx, {
      lineId: id,
      payeeId: null,
      parts: [
        { accountId: acc('6060'), taxCodeId: 'tax_gst', amount: asCents(8645) },
        { accountId: acc('6110'), taxCodeId: 'tax_gst', amount: asCents(15000) },
      ],
    });
    expect(result.ok).toBe(true);
    expect(balance('6060')).toBe(7859);
    expect(balance('6110')).toBe(13636);
    expect(balance('2200')).toBe(2150);
    booksSound();
  });

  it('refuses parts that do not add up to the line', () => {
    const id = line('OFFICEWORKS 0412', -23645);
    expect(
      postSplitLine(ctx, {
        lineId: id,
        payeeId: null,
        parts: [{ accountId: acc('6060'), taxCodeId: 'tax_gst', amount: asCents(8645) }],
      }),
    ).toEqual({ ok: false, error: 'invalid' });
    expect(status(id)).toBe('to-review');
  });
});

describe('transfers between his accounts (spec 073)', () => {
  it('pairs two waiting lines in one entry, with no GST', () => {
    const out = line('TRANSFER TO CASH RESERVE 7730', -200000, '2026-11-06');
    const into = line('TRANSFER FROM BUSINESS ONE 4821', 200000, '2026-11-07', reserve);
    const result = postTransfer(ctx, { lineId: out, otherBankAccountId: reserve });
    expect(result).toMatchObject({ ok: true, value: { alsoPosted: into } });
    expect(getReviewLine(ctx.db, out)).toMatchObject({ status: 'posted', pairedLineId: into });
    expect(getReviewLine(ctx.db, into)).toMatchObject({ status: 'posted', pairedLineId: out });
    expect(balance('1000')).toBe(-200000);
    expect(balance('1010')).toBe(200000);
    expect(balance('2200')).toBe(0);
    expect(countJournalEntries(ctx.db)).toBe(1);
    booksSound();
  });

  it('posts to the transfers account when the other side is not imported yet, and pairs when it arrives', () => {
    const out = line('TRANSFER TO CASH RESERVE 7730', -200000, '2026-11-06');
    expect(postTransfer(ctx, { lineId: out, otherBankAccountId: reserve }).ok).toBe(true);
    expect(getReviewLine(ctx.db, out)).toMatchObject({ status: 'posted', pairedLineId: null });
    expect(balance('1090')).toBe(200000);

    const into = line('TRANSFER FROM BUSINESS ONE 4821', 200000, '2026-11-08', reserve);
    const view = getReviewView(ctx);
    expect(view.lines.find((l) => l.id === into)?.transfer).toMatchObject({
      lineId: out,
      alreadyPosted: true,
    });
    expect(postTransfer(ctx, { lineId: into, otherBankAccountId: one }).ok).toBe(true);
    expect(getReviewLine(ctx.db, out)?.pairedLineId).toBe(into);
    expect(getReviewLine(ctx.db, into)?.pairedLineId).toBe(out);
    expect(balance('1090')).toBe(0);
    expect(balance('1010')).toBe(200000);
    booksSound();
  });

  it('with no match, the line waits in the transfers account', () => {
    const out = line('TRANSFER TO CASH RESERVE 7730', -200000, '2026-11-06');
    line('TRANSFER FROM BUSINESS ONE 4821', 199999, '2026-11-07', reserve);
    expect(postTransfer(ctx, { lineId: out, otherBankAccountId: reserve })).toMatchObject({
      ok: true,
      value: { alsoPosted: null },
    });
    expect(balance('1090')).toBe(200000);
  });
});

describe('matching an entry already in the books (spec 069a)', () => {
  function bookedPurchase(date: string, gross: number) {
    const posted = postEntry(ctx, {
      date: day(date),
      memo: 'Timber',
      sourceKind: 'manual',
      sourceId: null,
      lines: [
        {
          accountId: acc('5000'),
          amount: asCents(gross),
          taxCodeId: null,
          gst: asCents(0),
          payeeId: null,
          memo: '',
        },
        {
          accountId: acc('1000'),
          amount: asCents(-gross),
          taxCodeId: null,
          gst: asCents(0),
          payeeId: null,
          memo: '',
        },
      ],
    });
    if (!posted.ok) throw new Error('entry');
    return posted.value.id;
  }

  it('offers the entry and links the line with it, posting nothing', () => {
    const entryId = bookedPurchase('2026-11-03', 128470);
    const id = line('TIMBERLINK SUPPLIES PTY LTD', -128470);
    expect(getReviewView(ctx).lines[0]?.match).toMatchObject({ entryId, text: 'Timber' });
    expect(matchLine(ctx, { lineId: id, entryId }).ok).toBe(true);
    expect(getReviewLine(ctx.db, id)).toMatchObject({ status: 'posted', entryId });
    expect(countJournalEntries(ctx.db)).toBe(1);
    expect(balance('1000')).toBe(-128470);
    // Once linked, it is offered to no other line.
    line('TIMBERLINK SUPPLIES PTY LTD', -128470, '2026-11-05');
    expect(getReviewView(ctx).lines[0]?.match).toBeNull();
  });

  it('refuses an entry for another amount, or one already matched', () => {
    const entryId = bookedPurchase('2026-11-03', 128470);
    const wrong = line('X', -128471);
    expect(matchLine(ctx, { lineId: wrong, entryId })).toEqual({
      ok: false,
      error: 'no-longer-matches',
    });
    const first = line('Y', -128470);
    const second = line('Z', -128470);
    expect(matchLine(ctx, { lineId: first, entryId }).ok).toBe(true);
    expect(matchLine(ctx, { lineId: second, entryId })).toEqual({
      ok: false,
      error: 'no-longer-matches',
    });
  });

  it('offers one entry to only one of two lines for the same amount', () => {
    bookedPurchase('2026-11-03', 5000);
    line('A', -5000, '2026-11-03');
    line('B', -5000, '2026-11-04');
    expect(getReviewView(ctx).lines.map((l) => l.match !== null)).toEqual([true, false]);
  });
});

describe('undo the last post (spec 075)', () => {
  const post = (id: string) =>
    postLineToAccount(ctx, {
      lineId: id,
      accountId: acc('5000'),
      taxCodeId: 'tax_gst',
      payeeId: null,
    });

  it('undoes one: the entry is removed with its audit row, the line waits again', () => {
    const id = line('BUNNINGS 4532', -41260);
    post(id);
    const entryId = getReviewLine(ctx.db, id)?.entryId ?? '';
    expect(undoPost(ctx, [id])).toEqual({ ok: true, value: { lines: 1 } });
    expect(getReviewLine(ctx.db, id)).toMatchObject({ status: 'to-review', entryId: null });
    expect(getJournalEntry(ctx.db, entryId)).toBeNull();
    expect(
      listAudit(ctx.db, { table: 'journal_entry', rowId: entryId }).map((a) => a.kind),
    ).toEqual(['entry.post', 'entry.remove']);
    expect(balance('5000')).toBe(0);
    booksSound();
  });

  it('undoes a batch of many', () => {
    const ids = [line('A', -1000), line('B', -2000), line('C', -3000)];
    postLines(
      ctx,
      ids.map((lineId) => ({
        kind: 'account',
        lineId,
        accountId: acc('5000'),
        taxCodeId: null,
        payeeId: null,
      })),
    );
    expect(undoPost(ctx, ids)).toEqual({ ok: true, value: { lines: 3 } });
    expect(countJournalEntries(ctx.db)).toBe(0);
    expect(ids.map(status)).toEqual(['to-review', 'to-review', 'to-review']);
  });

  it('is refused in a locked period, and nothing changes', () => {
    const ids = [line('A', -1000, '2026-11-02'), line('B', -2000, '2026-11-20')];
    postLines(
      ctx,
      ids.map((lineId) => ({
        kind: 'account',
        lineId,
        accountId: acc('5000'),
        taxCodeId: null,
        payeeId: null,
      })),
    );
    ctx.db.prepare("UPDATE business SET lock_date = '2026-11-10'").run();
    expect(undoPost(ctx, ids)).toEqual({ ok: false, error: 'locked' });
    expect(ids.map(status)).toEqual(['posted', 'posted']);
    expect(countJournalEntries(ctx.db)).toBe(2);
  });

  it('undoes a paired transfer: both lines wait again', () => {
    const out = line('TRANSFER TO CASH RESERVE 7730', -200000, '2026-11-06');
    const into = line('TRANSFER FROM BUSINESS ONE 4821', 200000, '2026-11-07', reserve);
    postTransfer(ctx, { lineId: out, otherBankAccountId: reserve });
    expect(undoPost(ctx, [out])).toEqual({ ok: true, value: { lines: 2 } });
    expect([status(out), status(into)]).toEqual(['to-review', 'to-review']);
    booksSound();
  });

  it('undoing the later side of a transfer leaves the first waiting in the transfers account', () => {
    const out = line('TRANSFER TO CASH RESERVE 7730', -200000, '2026-11-06');
    postTransfer(ctx, { lineId: out, otherBankAccountId: reserve });
    const into = line('TRANSFER FROM BUSINESS ONE 4821', 200000, '2026-11-08', reserve);
    postTransfer(ctx, { lineId: into, otherBankAccountId: one });
    expect(undoPost(ctx, [into]).ok).toBe(true);
    expect(getReviewLine(ctx.db, out)).toMatchObject({ status: 'posted', pairedLineId: null });
    expect(balance('1090')).toBe(200000);
    booksSound();
  });

  it('undoes a match by unlinking, and leaves the entry', () => {
    const entry = postEntry(ctx, {
      date: day('2026-11-04'),
      memo: 'Fuel',
      sourceKind: 'bank-line',
      sourceId: null,
      lines: [
        {
          accountId: acc('6050'),
          amount: asCents(8820),
          taxCodeId: null,
          gst: asCents(0),
          payeeId: null,
          memo: '',
        },
        {
          accountId: acc('1000'),
          amount: asCents(-8820),
          taxCodeId: null,
          gst: asCents(0),
          payeeId: null,
          memo: '',
        },
      ],
    });
    if (!entry.ok) throw new Error('entry');
    const id = line('AMPOL ALEXANDRIA', -8820);
    matchLine(ctx, { lineId: id, entryId: entry.value.id });
    expect(undoPost(ctx, [id]).ok).toBe(true);
    expect(status(id)).toBe('to-review');
    expect(getJournalEntry(ctx.db, entry.value.id)).not.toBeNull();
  });

  it('refuses a line that is not posted', () => {
    expect(undoPost(ctx, [line('A', -1000)])).toEqual({ ok: false, error: 'not-posted' });
  });
});

describe('payees saved and filled in (spec 071)', () => {
  it('saves a new contact, and two more lines with the same words show it', () => {
    const first = line('BUNNINGS 4532', -41260);
    line('BUNNINGS 8812', -1299);
    line('BUNNINGS 4532 ALEXANDRIA', -5000);
    line('AMPOL ALEXANDRIA', -8820);
    const saved = savePayeeFromLine(ctx, { lineId: first, name: ' Bunnings ' });
    expect(saved).toMatchObject({
      ok: true,
      value: {
        name: 'Bunnings',
        created: true,
        kindOfContact: 'supplier',
        words: 'BUNNINGS',
        alsoFilled: 2,
      },
    });
    // Spec 122: a contact saved this way says it came from a bank line.
    expect(getContactByName(ctx.db, 'Bunnings')?.createdFrom).toBe('bank-line');
    expect(getReviewView(ctx).lines.map((l) => l.payee?.name ?? null)).toEqual([
      'Bunnings',
      'Bunnings',
      'Bunnings',
      null,
    ]);
  });

  it('uses an existing contact, ignoring capitals, rather than making a second', () => {
    const first = line('DEPOSIT ELLIS BATHROOMS INV 1058', 330000);
    savePayeeFromLine(ctx, { lineId: first, name: 'Ellis Bathrooms' });
    const second = line('DEP ELLIS BATHROOMS', 1000);
    expect(savePayeeFromLine(ctx, { lineId: second, name: 'ellis bathrooms' })).toMatchObject({
      ok: true,
      value: { created: false, name: 'Ellis Bathrooms', kindOfContact: 'customer' },
    });
    expect(listContacts(ctx.db)).toHaveLength(1);
  });

  it('undo removes the new contact and clears what it filled', () => {
    const first = line('BUNNINGS 4532', -41260);
    line('BUNNINGS 8812', -1299);
    const saved = savePayeeFromLine(ctx, { lineId: first, name: 'Bunnings' });
    if (!saved.ok) throw new Error('save');
    expect(
      undoSavePayee(ctx, { contactId: saved.value.contactId, words: saved.value.words }).ok,
    ).toBe(true);
    expect(listContacts(ctx.db)).toHaveLength(0);
    expect(getReviewView(ctx).lines.every((l) => l.payee === null)).toBe(true);
    expect(listAudit(ctx.db, { table: 'contact' }).map((a) => a.kind)).toEqual([
      'contact.add',
      'contact.remove',
    ]);
  });

  it('undo keeps a contact that a posted line already uses', () => {
    const first = line('BUNNINGS 4532', -41260);
    const saved = savePayeeFromLine(ctx, { lineId: first, name: 'Bunnings' });
    if (!saved.ok) throw new Error('save');
    postLineToAccount(ctx, {
      lineId: first,
      accountId: acc('5000'),
      taxCodeId: null,
      payeeId: saved.value.contactId,
    });
    undoSavePayee(ctx, { contactId: saved.value.contactId, words: saved.value.words });
    expect(listContacts(ctx.db)).toHaveLength(1);
  });

  it('refuses an empty name and a description with no words', () => {
    expect(savePayeeFromLine(ctx, { lineId: line('BUNNINGS', -1), name: '  ' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(savePayeeFromLine(ctx, { lineId: line('4532 0412', -1), name: 'X' })).toEqual({
      ok: false,
      error: 'no-words',
    });
  });
});

describe('suggestions in To review (spec 074)', () => {
  it('a line like one posted before is suggested its account, and a new one is not', () => {
    const first = line('BUNNINGS 4532', -41260, '2026-11-04');
    const saved = savePayeeFromLine(ctx, { lineId: first, name: 'Bunnings' });
    if (!saved.ok) throw new Error('save');
    postLineToAccount(ctx, {
      lineId: first,
      accountId: acc('5000'),
      taxCodeId: 'tax_gst',
      payeeId: saved.value.contactId,
    });
    const again = line('BUNNINGS 4532', -1299, '2026-11-12');
    const fresh = line('COVERWISE INSURANCE', -64000, '2026-11-12');
    const view = getReviewView(ctx);
    expect(view.lines.find((l) => l.id === again)).toMatchObject({
      suggestion: { accountId: acc('5000'), taxCodeId: 'tax_gst', reason: 'same-as-last-time' },
      payee: { name: 'Bunnings' },
    });
    expect(view.lines.find((l) => l.id === fresh)?.suggestion).toBeNull();
  });
});

describe('the To review list (spec 068)', () => {
  it('filters by bank account, by what the app has, and by search, and they combine', () => {
    const posted = line('BUNNINGS 4532', -41260, '2026-11-01');
    postLineToAccount(ctx, {
      lineId: posted,
      accountId: acc('5000'),
      taxCodeId: null,
      payeeId: null,
    });
    line('BUNNINGS 4532', -1000, '2026-11-02');
    line('AMPOL ALEXANDRIA', -8820, '2026-11-03');
    line('INTEREST', 412, '2026-11-30', reserve);

    const all = getReviewView(ctx);
    expect(all.waiting).toBe(3);
    expect(all.counts).toEqual({ all: 3, suggested: 1, noSuggestion: 2 });
    expect(getReviewView(ctx, { bankAccountId: reserve }).lines.map((l) => l.description)).toEqual([
      'INTEREST',
    ]);
    expect(
      getReviewView(ctx, { bankAccountId: one, show: 'no-suggestion' }).lines.map(
        (l) => l.description,
      ),
    ).toEqual(['AMPOL ALEXANDRIA']);
    expect(getReviewView(ctx, { search: 'bunn', show: 'suggested' }).lines).toHaveLength(1);
    expect(getReviewView(ctx, { search: '88.20' }).lines.map((l) => l.description)).toEqual([
      'AMPOL ALEXANDRIA',
    ]);
    expect(getReviewView(ctx, { search: '$88.20' }).counts.all).toBe(1);
    // Filters narrow the list and its counts, never the sidebar's count.
    expect(getReviewView(ctx, { search: 'nothing like this' })).toMatchObject({
      waiting: 3,
      counts: { all: 0 },
    });
  });

  it('offers every active account but his bank accounts and the transfers account', () => {
    const codes = getReviewView(ctx).accounts.map((a) => a.code);
    expect(codes).toContain('5000');
    expect(codes).toContain('2200');
    expect(codes).not.toContain('1000');
    expect(codes).not.toContain('1010');
    expect(codes).not.toContain('1090');
  });

  it('lists at most 200 lines, oldest first, and counts them all', () => {
    for (let i = 0; i < 250; i += 1)
      line(`LINE ${String(i)}`, -(100 + i), i < 100 ? '2026-11-02' : '2026-11-01');
    const view = getReviewView(ctx);
    expect(view.lines).toHaveLength(200);
    expect(view.counts.all).toBe(250);
    expect(view.lines[0]?.date).toBe('2026-11-01');
  });
});
