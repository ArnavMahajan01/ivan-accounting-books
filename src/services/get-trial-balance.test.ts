import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import type { EntryInput, EntryLineInput } from '@domain/journal';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { getTrialBalance } from './get-trial-balance';
import { postEntry } from './post-journal';
import { setupBusiness } from './setup-business';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  setupBusiness(ctx, {
    name: 'Harbour Lane Joinery Pty Ltd',
    abn: '35482916037',
    gstRegistered: true,
    gstBasis: 'cash',
    basFrequency: 'quarterly',
  });
});
afterEach(() => {
  ctx.close();
});

function day(text: string): CalendarDate {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
}

function line(code: string, amount: number, gst = 0): EntryLineInput {
  const account = getAccountByCode(ctx.db, code);
  if (account === null) throw new Error(`no account ${code}`);
  return {
    accountId: account.id,
    amount: asCents(amount),
    taxCodeId: null,
    gst: asCents(gst),
    payeeId: null,
    memo: '',
  };
}

function post(date: string, lines: EntryLineInput[]): void {
  const entry: EntryInput = {
    date: day(date),
    memo: '',
    sourceKind: 'manual',
    sourceId: null,
    lines,
  };
  const result = postEntry(ctx, entry);
  if (!result.ok) throw new Error(`not posted: ${JSON.stringify(result.error)}`);
}

// A small invented year, worked out by hand:
//   1. 5 Jul:  capital put in, $10,000.        bank +1,000,000  share capital -1,000,000
//   2. 10 Jul: a sale of $1,100 with GST.      bank +110,000    sales -100,000   GST -10,000
//   3. 2 Aug:  timber, $550 with GST.          materials +50,000  GST +5,000     bank -55,000
//   4. 20 Aug: a $15 bank fee, no GST.         bank fees +1,500   bank -1,500
//   5. 15 Sep: $2,000 moved to savings.        savings +200,000   bank -200,000
function postTheYear() {
  post('2026-07-05', [line('1000', 1000000), line('3000', -1000000)]);
  post('2026-07-10', [line('1000', 110000), line('4000', -100000, -10000), line('2200', -10000)]);
  post('2026-08-02', [line('5000', 50000, 5000), line('2200', 5000), line('1000', -55000)]);
  post('2026-08-20', [line('6010', 1500), line('1000', -1500)]);
  post('2026-09-15', [line('1010', 200000), line('1000', -200000)]);
}

const summary = (tb: ReturnType<typeof getTrialBalance>) => {
  if (!tb.ok) throw new Error(tb.error);
  return {
    rows: tb.value.rows.map((r) => [r.code, r.debit, r.credit]),
    totals: [tb.value.totalDebit, tb.value.totalCredit, tb.value.balanced],
  };
};

describe('getTrialBalance', () => {
  it('is empty and balanced for an empty book', () => {
    expect(summary(getTrialBalance(ctx, { from: null, to: null }))).toEqual({
      rows: [],
      totals: [0, 0, true],
    });
  });

  it('matches the hand-worked year to the cent', () => {
    postTheYear();
    expect(summary(getTrialBalance(ctx, { from: null, to: null }))).toEqual({
      rows: [
        ['1000', 853500, 0], // 1,000,000 + 110,000 - 55,000 - 1,500 - 200,000
        ['1010', 200000, 0],
        ['2200', 0, 5000], // -10,000 + 5,000
        ['3000', 0, 1000000],
        ['4000', 0, 100000],
        ['5000', 50000, 0],
        ['6010', 1500, 0],
      ],
      totals: [1105000, 1105000, true],
    });
  });

  it('counts only the days in the range, including both ends', () => {
    postTheYear();
    // August only: entries 3 and 4.
    expect(
      summary(getTrialBalance(ctx, { from: day('2026-08-01'), to: day('2026-08-31') })),
    ).toEqual({
      rows: [
        ['1000', 0, 56500],
        ['2200', 5000, 0],
        ['5000', 50000, 0],
        ['6010', 1500, 0],
      ],
      totals: [56500, 56500, true],
    });
    // A range that starts and ends on the same day as an entry takes just that entry.
    expect(
      summary(getTrialBalance(ctx, { from: day('2026-07-10'), to: day('2026-07-10') })).rows,
    ).toEqual([
      ['1000', 110000, 0],
      ['2200', 0, 10000],
      ['4000', 0, 100000],
    ]);
  });

  it('cuts through entries by date, never through an entry', () => {
    postTheYear();
    for (const [from, to] of [
      ['2026-07-06', '2026-08-01'],
      ['2026-07-11', '2026-08-19'],
      ['2026-08-21', null],
      [null, '2026-07-04'],
      [null, '2026-09-14'],
    ] as const) {
      const tb = getTrialBalance(ctx, {
        from: from === null ? null : day(from),
        to: to === null ? null : day(to),
      });
      expect(tb.ok && tb.value.balanced, `${String(from)} to ${String(to)}`).toBe(true);
    }
    expect(
      summary(getTrialBalance(ctx, { from: day('2026-07-06'), to: day('2026-08-01') })).totals,
    ).toEqual([110000, 110000, true]);
  });

  it('has debits equal to credits after any number of entries', () => {
    for (let n = 1; n <= 40; n += 1) {
      post(`2026-0${String(7 + (n % 3))}-1${String(n % 10)}`, [
        line('1000', n * 101),
        line('4000', -n * 101),
      ]);
    }
    const tb = getTrialBalance(ctx, { from: null, to: null });
    expect(tb.ok && tb.value.balanced).toBe(true);
  });

  it('refuses a range that ends before it starts', () => {
    expect(getTrialBalance(ctx, { from: day('2026-09-01'), to: day('2026-08-01') })).toEqual({
      ok: false,
      error: 'range-ends-before-it-starts',
    });
  });

  it('shows what is stored, so a corrupted book says it is out of balance', () => {
    postTheYear();
    ctx.db
      .prepare(
        'UPDATE journal_line SET amount_cents = amount_cents + 1 WHERE id = (SELECT id FROM journal_line LIMIT 1)',
      )
      .run();
    const tb = getTrialBalance(ctx, { from: null, to: null });
    expect(tb.ok && tb.value.balanced).toBe(false);
  });
});
