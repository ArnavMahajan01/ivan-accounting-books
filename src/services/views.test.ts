import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { countJournalEntries } from '@data/journal-queries';
import type { EntryLineInput } from '@domain/journal';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { listAccountsWithBalances } from './list-accounts';
import { getHomeSummary } from './get-home-summary';
import { getTransaction } from './get-transaction';
import { getTrialBalance } from './get-trial-balance';
import { listTransactions, type TransactionFilters } from './list-transactions';
import { postEntry } from './post-journal';
import { buildSampleBooks } from './sample/build-sample-books';
import { SAMPLE_FIGURES } from './sample/sample-figures';
import { setupBusiness } from './setup-business';
import { createTestContext } from './test-context';

const day = (text: string): CalendarDate => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(`bad date ${text}`);
  return parsed.value;
};

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  buildSampleBooks(ctx, day('2026-11-23'));
});
afterEach(() => {
  ctx.close();
});

function list(filters: TransactionFilters = {}) {
  const result = listTransactions(ctx, filters);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
const accountId = (code: string): string => getAccountByCode(ctx.db, code)?.id ?? '';

describe('getHomeSummary on the sample books', () => {
  it('gives the four numbers from the wireframe: $43,642.35, 0 lines, $3,184.20 GST and $42,453.50 profit', () => {
    const home = getHomeSummary(ctx);
    expect(home.brandNew).toBe(false);
    expect(home.bank).toEqual({ balance: 4364235, accountCount: 2 });
    expect(home.linesToReview).toEqual({ count: 0, oldest: null });
    expect(home.gst).toEqual({
      owing: 318420,
      periodLabel: 'Oct–Dec 2026',
      periodEnd: '2026-12-31',
    });
    expect(home.profit).toEqual({ amount: 4245350, yearLabel: 'FY 2026–27', from: '2026-07-01' });
  });

  it('matches the sample figures list, and has no jobs and no warnings', () => {
    const home = getHomeSummary(ctx);
    expect(home.bank.balance).toBe(SAMPLE_FIGURES.bankBalance);
    expect(home.gst.owing).toBe(SAMPLE_FIGURES.gstOwingOctToDec);
    expect(home.profit.amount).toBe(SAMPLE_FIGURES.profit);
    expect(home.nextSteps).toEqual([]);
    expect(home.upToDate).toBe(true);
    expect(home.warnings).toEqual([]);
  });

  it('shows a warning when the books do not balance', () => {
    ctx.db.prepare('UPDATE journal_line SET amount_cents = amount_cents + 1 WHERE rowid = 1').run();
    expect(getHomeSummary(ctx).warnings).toEqual(['out-of-balance']);
  });

  it('moves to the next BAS period when the date does, and counts only its own days', () => {
    const later = { ...ctx, clock: { today: () => day('2027-01-15'), now: () => ctx.clock.now() } };
    const home = getHomeSummary(later);
    expect(home.gst).toEqual({ owing: 0, periodLabel: 'Jan–Mar 2027', periodEnd: '2027-03-31' });
    // The year so far still includes everything since 1 July, so the profit is the same.
    expect(home.profit.amount).toBe(SAMPLE_FIGURES.profit);
  });

  it('counts only the part of the quarter up to today', () => {
    const early = { ...ctx, clock: { today: () => day('2026-10-31'), now: () => ctx.clock.now() } };
    const owing = getHomeSummary(early).gst.owing;
    expect(owing).toBeGreaterThan(0);
    expect(owing).toBeLessThan(SAMPLE_FIGURES.gstOwingOctToDec);
  });
});

describe('getHomeSummary on new books', () => {
  it('says brand new when there are no entries, and shows zeros', () => {
    const fresh = createTestContext();
    setupBusiness(fresh, {
      name: 'A Pty Ltd',
      abn: '18123456789',
      gstRegistered: true,
      gstBasis: 'cash',
      basFrequency: 'monthly',
    });
    const home = getHomeSummary(fresh);
    expect(home.brandNew).toBe(true);
    expect(home.bank).toEqual({ balance: 0, accountCount: 0 });
    expect(home.gst.owing).toBe(0);
    expect(home.gst.periodLabel).toBe('November 2026');
    expect(home.profit.amount).toBe(0);
    fresh.close();
  });

  it('works before the business is even set up', () => {
    const bare = createTestContext();
    expect(getHomeSummary(bare)).toMatchObject({
      brandNew: true,
      gst: { periodLabel: 'Oct–Dec 2026' },
    });
    bare.close();
  });
});

describe('listAccountsWithBalances', () => {
  it('gives every account, with balances that match the trial balance to the cent', () => {
    const view = listAccountsWithBalances(ctx);
    const tb = getTrialBalance(ctx, { from: null, to: day('2026-11-23') });
    if (!tb.ok) throw new Error('trial balance');
    expect(view.asAt).toBe('2026-11-23');
    expect(view.accounts).toHaveLength(39);
    for (const row of tb.value.rows) {
      const account = view.accounts.find((a) => a.id === row.accountId);
      expect(account?.balance, row.name).toBe(row.debit - row.credit);
    }
    const withBalance = view.accounts.filter((a) => a.balance !== 0).length;
    expect(withBalance).toBe(tb.value.rows.length);
  });

  it('shows the bank accounts, and the usual GST for each account', () => {
    const view = listAccountsWithBalances(ctx);
    const byCode = (code: string) => view.accounts.find((a) => a.code === code);
    expect(byCode('1000')).toMatchObject({
      name: 'Business One ··4821',
      balance: 1864235,
      bank: { bank: 'Westpac', lastFour: '4821' },
    });
    expect(byCode('1010')).toMatchObject({
      name: 'Business Cash Reserve ··7730',
      balance: 2500000,
      bank: { lastFour: '7730' },
    });
    expect(byCode('4000')).toMatchObject({
      usualGst: { shortCode: 'GST', treatment: 'taxable' },
      bank: null,
    });
    expect(byCode('2200')).toMatchObject({
      balance: -318420,
      usualGst: { shortCode: 'N-T', treatment: 'outside-gst' },
    });
    expect(byCode('6010')?.usualGst).toEqual({ shortCode: 'INP', treatment: 'input-taxed' });
  });

  it('leaves out entries dated after today', () => {
    const earlier = {
      ...ctx,
      clock: { today: () => day('2026-09-30'), now: () => ctx.clock.now() },
    };
    const bank = listAccountsWithBalances(earlier).accounts.find((a) => a.code === '1000');
    expect(bank?.balance).not.toBe(1864235);
  });
});

describe('listTransactions', () => {
  it('lists every entry, newest first, with the wireframe’s rows', () => {
    const page = list({ limit: 200 });
    expect(page.matching).toBe(SAMPLE_FIGURES.entries);
    expect(page.rows).toHaveLength(SAMPLE_FIGURES.entries);
    const dates = page.rows.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
    const row = (payee: string, date: string) =>
      page.rows.find((r) => r.payee === payee && r.date === date);
    expect(row('Smith Renovations', '2026-11-15')).toMatchObject({
      sourceKind: 'invoice',
      direction: 'in',
      account: { code: '4000', name: 'Sales' },
      beforeGst: 450000,
      gst: 45000,
      total: 495000,
      locked: false,
    });
    expect(row('Timberlink', '2026-09-28')).toMatchObject({
      direction: 'out',
      account: { name: 'Materials and supplies' },
      beforeGst: 194545,
      gst: 19455,
      total: 214000,
    });
    expect(row('Bunnings', '2026-11-18')).toMatchObject({
      beforeGst: 31105,
      gst: 3110,
      total: 34215,
    });
    expect(row('Ampol', '2026-11-16')).toMatchObject({
      account: { name: 'Motor vehicle expenses' },
      beforeGst: 8764,
      gst: 876,
      total: 9640,
    });
  });

  it('shows transfers, drawings and the BAS payment with no payee, or the ATO, and the right account', () => {
    const page = list({ limit: 200 });
    const transfer = page.rows.find((r) => r.memo === 'Transfer to Business Cash Reserve');
    expect(transfer).toMatchObject({
      direction: 'transfer',
      payee: null,
      account: { name: 'Business Cash Reserve ··7730' },
      gst: 0,
    });
    expect(page.rows.find((r) => r.memo === 'Owner drawings')).toMatchObject({
      direction: 'out',
      account: { name: 'Owner drawings' },
    });
    expect(page.rows.find((r) => r.memo === 'BAS Jul–Sep 2026')).toMatchObject({
      payee: 'Australian Taxation Office',
      account: { name: 'GST' },
      total: 78516,
    });
  });

  it('adds up the totals over every matching entry, not only the page', () => {
    const all = list({ limit: 200 });
    const small = list({ limit: 10 });
    expect(small.rows).toHaveLength(10);
    expect(small.totals).toEqual(all.totals);
    expect(all.rows.reduce((sum, r) => sum + r.total, 0)).toBe(all.totals.total);
    expect(all.totals.total - all.totals.gst).toBe(all.totals.beforeGst);
  });

  it('pages without repeating or missing a row', () => {
    const ids = [0, 30, 60, 90].flatMap((offset) =>
      list({ limit: 30, offset }).rows.map((r) => r.id),
    );
    expect(ids).toHaveLength(SAMPLE_FIGURES.entries);
    expect(new Set(ids).size).toBe(SAMPLE_FIGURES.entries);
    expect(ids).toEqual(list({ limit: 200 }).rows.map((r) => r.id));
    expect(list({ limit: 30, offset: 90 }).rows).toHaveLength(4);
    expect(list({ limit: 30, offset: 120 }).rows).toEqual([]);
  });

  it('filters by kind: money in, money out and transfers add up to everything', () => {
    const counts = (['money-in', 'money-out', 'transfers'] as const).map(
      (kind) => list({ kind }).matching,
    );
    expect(counts).toEqual([21, 70, 3]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(SAMPLE_FIGURES.entries);
    expect(list({ kind: 'money-in', limit: 200 }).rows.every((r) => r.direction === 'in')).toBe(
      true,
    );
    expect(list({ kind: 'transfers' }).rows.every((r) => r.direction === 'transfer')).toBe(true);
  });

  it('filters by date range, both days included', () => {
    const october = list({ from: '2026-10-01', to: '2026-10-31', limit: 200 });
    expect(october.rows.length).toBeGreaterThan(5);
    expect(october.rows.every((r) => r.date >= '2026-10-01' && r.date <= '2026-10-31')).toBe(true);
    expect(list({ from: '2026-11-15', to: '2026-11-15' }).rows.map((r) => r.date)).toEqual([
      '2026-11-15',
    ]);
    expect(list({ from: '2026-11-21' }).matching).toBe(0);
  });

  it('filters by account, and its total matches the trial balance for the same days', () => {
    for (const code of ['5000', '1000', '2200', '4000']) {
      const page = list({
        accountId: accountId(code),
        from: '2026-08-01',
        to: '2026-10-31',
        limit: 200,
      });
      const tb = getTrialBalance(ctx, { from: day('2026-08-01'), to: day('2026-10-31') });
      if (!tb.ok) throw new Error('trial balance');
      const row = tb.value.rows.find((r) => r.accountId === accountId(code));
      expect(page.accountTotal, code).toBe((row?.debit ?? 0) - (row?.credit ?? 0));
    }
    expect(list({ accountId: accountId('5000') }).accountTotal).toBe(981240);
    expect(list({}).accountTotal).toBeNull();
  });

  it('finds words in the description, the payee and the account, in any capitals', () => {
    expect(list({ search: 'bunnings' }).matching).toBe(4);
    expect(
      list({ search: 'TIMBER' }).rows.every((r) =>
        `${r.payee ?? ''} ${r.memo} ${r.account?.name ?? ''}`.toLowerCase().includes('timber'),
      ),
    ).toBe(true);
    expect(list({ search: 'owner drawings' }).matching).toBe(5);
    expect(list({ search: 'Sales' }).matching).toBe(20);
    expect(list({ search: 'zzz nothing' }).matching).toBe(0);
  });

  it('finds an entry by its total when the search is an amount', () => {
    const found = list({ search: '342.15' });
    expect(found.rows.map((r) => [r.payee, r.total])).toEqual([['Bunnings', 34215]]);
    expect(list({ search: '$4,950.00' }).rows.map((r) => r.payee)).toEqual([
      'Smith Renovations',
      'Harbourview Developments',
    ]);
  });

  it('treats % and _ in a search as plain characters, never as wildcards', () => {
    expect(list({ search: '%' }).matching).toBe(0);
    expect(list({ search: '_' }).matching).toBe(0);
    expect(list({ search: "'; DROP TABLE journal_entry; --" }).matching).toBe(0);
    expect(countJournalEntries(ctx.db)).toBe(SAMPLE_FIGURES.entries);
  });

  it('combines every filter', () => {
    const page = list({
      kind: 'money-out',
      accountId: accountId('5000'),
      from: '2026-10-01',
      search: 'timberlink',
    });
    expect(page.rows.map((r) => [r.payee, r.date])).toEqual([['Timberlink', '2026-10-09']]);
    expect(page.accountTotal).toBe(80000);
  });

  it('marks entries on or before the lock date as locked', () => {
    ctx.db.prepare("UPDATE business SET lock_date = '2026-09-30'").run();
    const page = list({ limit: 200 });
    expect(page.rows.filter((r) => r.locked).every((r) => r.date <= '2026-09-30')).toBe(true);
    expect(page.rows.filter((r) => !r.locked).every((r) => r.date > '2026-09-30')).toBe(true);
    expect(page.rows.some((r) => r.locked)).toBe(true);
  });

  it('turns a ready-made period into the days it covers, and says which days they are', () => {
    expect(list({ period: 'all' }).range).toEqual({ from: null, to: null });
    expect(list({ period: 'financial-year' }).range).toEqual({
      from: '2026-07-01',
      to: '2027-06-30',
    });
    expect(list({ period: 'bas-period' }).range).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(list({ period: 'last-12-months' }).range).toEqual({
      from: '2025-11-24',
      to: '2026-11-23',
    });
    expect(list({}).range).toEqual({ from: null, to: null });
    expect(list({ period: 'bas-period' }).matching).toBe(
      list({ from: '2026-10-01', to: '2026-12-31' }).matching,
    );
  });

  it('uses days that were typed in place of a period, and 28 February for the day after a leap day', () => {
    expect(list({ period: 'financial-year', from: '2026-08-01' }).range).toEqual({
      from: '2026-08-01',
      to: null,
    });
    const leap = { ...ctx, clock: { today: () => day('2028-02-29'), now: () => ctx.clock.now() } };
    const result = listTransactions(leap, { period: 'last-12-months' });
    expect(result.ok && result.value.range).toEqual({ from: '2027-03-01', to: '2028-02-29' });
  });

  it('refuses a date that does not exist, and a range that ends before it starts', () => {
    expect(listTransactions(ctx, { from: '2026-02-31' })).toEqual({ ok: false, error: 'bad-date' });
    expect(listTransactions(ctx, { from: '2026-10-02', to: '2026-10-01' })).toEqual({
      ok: false,
      error: 'range-ends-before-it-starts',
    });
  });

  it('is empty for books with nothing in them', () => {
    const fresh = createTestContext();
    expect(listTransactions(fresh, {})).toMatchObject({
      ok: true,
      value: { rows: [], matching: 0, totals: { total: 0 } },
    });
    fresh.close();
  });
});

describe('listTransactions with a thousand entries', () => {
  it('lists a page quickly, and filters and totals stay exact', () => {
    const line = (code: string, amount: number): EntryLineInput => ({
      accountId: getAccountByCode(ctx.db, code)?.id ?? ('acc_none' as const),
      amount: asCents(amount),
      taxCodeId: null,
      gst: asCents(0),
      payeeId: null,
      memo: '',
    });
    const before = countJournalEntries(ctx.db);
    for (let n = 1; n <= 1000; n += 1) {
      const date = day(
        `2026-${String(7 + (n % 4)).padStart(2, '0')}-${String(1 + (n % 27)).padStart(2, '0')}`,
      );
      const posted = postEntry(ctx, {
        date,
        memo: `Bulk ${String(n)}`,
        sourceKind: 'manual',
        sourceId: null,
        lines: [line('6060', n), line('1000', -n)],
      });
      if (!posted.ok) throw new Error('not posted');
    }
    const started = Date.now();
    const page = list({ limit: 100 });
    const filtered = list({ search: 'Bulk 99', accountId: accountId('6060') });
    const elapsed = Date.now() - started;
    expect(page.matching).toBe(before + 1000);
    expect(page.rows).toHaveLength(100);
    expect(filtered.matching).toBe(11); // Bulk 99, and Bulk 990 to 999
    expect(elapsed).toBeLessThan(2000);
    const tb = getTrialBalance(ctx, { from: null, to: day('2026-11-23') });
    if (!tb.ok) throw new Error('trial balance');
    expect(tb.value.balanced).toBe(true);
  });
});

describe('getTransaction', () => {
  const idOf = (payee: string, date: string): string => {
    const row = list({ limit: 200 }).rows.find((r) => r.payee === payee && r.date === date);
    if (row === undefined) throw new Error(`no ${payee}`);
    return row.id;
  };

  it('shows a sale’s lines, which sum to zero, with its GST and its Posted history', () => {
    const detail = getTransaction(ctx, idOf('Smith Renovations', '2026-11-15'));
    expect(detail).toMatchObject({
      date: '2026-11-15',
      payee: 'Smith Renovations',
      sourceKind: 'invoice',
      beforeGst: 450000,
      gst: 45000,
      total: 495000,
      locked: false,
    });
    expect(detail?.lines.map((l) => [l.accountCode, l.debit, l.credit, l.gst, l.taxCode])).toEqual([
      ['1000', 495000, 0, 0, null],
      ['4000', 0, 450000, -45000, 'GST'],
      ['2200', 0, 45000, 0, null],
    ]);
    const lines = detail?.lines ?? [];
    expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(lines.reduce((s, l) => s + l.credit, 0));
    expect(detail?.history.map((h) => [h.kind, h.changes])).toEqual([['posted', []]]);
    expect(detail?.history[0]?.at).toMatch(/^2026-11-15T/);
  });

  it('shows a corrected entry’s history in words: the account, then the date', () => {
    const bunnings = getTransaction(ctx, idOf('Bunnings', '2026-11-18'));
    expect(bunnings?.history.map((h) => h.kind)).toEqual(['posted', 'changed']);
    expect(bunnings?.history[1]?.changes).toEqual([
      'Account changed from Tools and small equipment to Materials and supplies',
    ]);
    expect(bunnings?.history[1]?.at).toBe('2026-11-20T01:00:00.000Z');
    const timber = getTransaction(ctx, idOf('Timberlink', '2026-09-28'));
    expect(timber?.history[1]?.changes).toEqual(['Date changed from 29/09/2026 to 28/09/2026']);
  });

  it('is null for an entry that does not exist', () => {
    expect(getTransaction(ctx, 'ent_doesnotexist')).toBeNull();
  });

  it('says an entry is locked once the lock date reaches it', () => {
    const id = idOf('Timberlink', '2026-09-28');
    ctx.db.prepare("UPDATE business SET lock_date = '2026-09-30'").run();
    expect(getTransaction(ctx, id)?.locked).toBe(true);
  });
});
