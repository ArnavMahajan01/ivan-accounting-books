import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { asCents, type Cents } from '@shared/money';
import type { ReportView } from '@shared/reports';
import { basFigures } from './bas';
import { csvAmount, csvText, reportCsv } from './csv';
import {
  buildBalanceSheet,
  buildBasWorksheet,
  buildProfitAndLoss,
  buildTrialBalanceReport,
  withOwnColumns,
  type ReportAccount,
} from './report-build';
import {
  difference,
  gstInside,
  percentChange,
  percentOfIncome,
  percentText,
  ratioBp,
} from './report-calcs';
import { monthsOf, periodBefore, resolvePeriod, sameLastYear } from './report-periods';

const d = (t: string) => t as CalendarDate;
const none = { from: null, to: null };
const today = d('2026-11-21');

describe('report periods', () => {
  it('this quarter and this year run to today; last ones are whole', () => {
    expect(resolvePeriod('this-quarter', today, none)).toEqual({
      from: '2026-10-01',
      to: '2026-11-21',
      label: 'Oct–Dec 2026',
    });
    expect(resolvePeriod('last-quarter', today, none)).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
      label: 'Jul–Sep 2026',
    });
    expect(resolvePeriod('this-year', today, none)).toEqual({
      from: '2026-07-01',
      to: '2026-11-21',
      label: 'FY 2026–27',
    });
    expect(resolvePeriod('last-year', today, none)).toEqual({
      from: '2025-07-01',
      to: '2026-06-30',
      label: 'FY 2025–26',
    });
  });

  it('custom dates, and refuses them the wrong way round', () => {
    expect(
      resolvePeriod('custom', today, { from: d('2026-11-01'), to: d('2026-11-15') })?.label,
    ).toBe('01/11/2026 to 15/11/2026');
    expect(
      resolvePeriod('custom', today, { from: d('2026-11-15'), to: d('2026-11-01') }),
    ).toBeNull();
    expect(resolvePeriod('custom', today, none)).toBeNull();
  });

  it('the period before, and the same period last year', () => {
    const q = { from: d('2026-10-01'), to: d('2026-12-31'), label: 'Oct–Dec 2026' };
    expect(periodBefore(q)).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
      label: 'Jul–Sep 2026',
    });
    expect(sameLastYear(q)).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
      label: 'Oct–Dec 2025',
    });
    const fy = { from: d('2026-07-01'), to: d('2027-06-30'), label: 'FY 2026–27' };
    expect(periodBefore(fy).label).toBe('FY 2025–26');
    expect(sameLastYear({ from: d('2028-02-01'), to: d('2028-02-29'), label: 'x' }).to).toBe(
      '2027-02-28',
    );
  });

  it('month by month, cut to the period', () => {
    expect(
      monthsOf({ from: d('2026-07-01'), to: d('2026-09-15'), label: '' }).map((m) => [
        m.label,
        m.from,
        m.to,
      ]),
    ).toEqual([
      ['Jul 2026', '2026-07-01', '2026-07-31'],
      ['Aug 2026', '2026-08-01', '2026-08-31'],
      ['Sep 2026', '2026-09-01', '2026-09-15'],
    ]);
  });
});

describe('report calculations (spec 102)', () => {
  it('difference, % change and % of income in integer maths', () => {
    expect(difference(asCents(3845000), asCents(4800000))).toBe(-955000);
    expect(percentChange(asCents(3845000), asCents(4800000))).toBe(-1990);
    expect(percentOfIncome(asCents(981240), asCents(3845000))).toBe(2552);
    expect(ratioBp(1, 3)).toBe(3333);
    expect(ratioBp(-1, 3)).toBe(-3333);
  });

  it('a % of nothing is n/a, not a number', () => {
    expect(percentChange(asCents(100), asCents(0))).toBeNull();
    expect(percentOfIncome(asCents(100), asCents(0))).toBeNull();
    expect(percentText(null)).toBe('n/a');
    expect(percentText(2552)).toBe('25.5%');
    expect(percentText(-1990)).toBe('-19.9%');
    expect(percentText(4)).toBe('0.0%');
  });

  it('GST inside an amount is one eleventh, from the one GST helper', () => {
    expect(gstInside(asCents(110000))).toBe(10000);
    expect(gstInside(asCents(41260))).toBe(3751);
  });
});

const accounts: ReportAccount[] = [
  { id: 'acc_bank', code: '1000', name: 'Business One', type: 'asset', active: true },
  { id: 'acc_gst', code: '2200', name: 'GST', type: 'liability', active: true },
  { id: 'acc_capital', code: '3000', name: 'Share capital', type: 'equity', active: true },
  { id: 'acc_sales', code: '4000', name: 'Sales', type: 'income', active: true },
  { id: 'acc_mat', code: '5000', name: 'Materials and supplies', type: 'expense', active: true },
  { id: 'acc_fees', code: '6010', name: 'Bank fees', type: 'expense', active: true },
  { id: 'acc_phone', code: '6100', name: 'Telephone and internet', type: 'expense', active: true },
  { id: 'acc_idle', code: '6200', name: 'Workshop consumables', type: 'expense', active: true },
];
const m = (entries: [string, number][]) =>
  new Map<string, Cents>(entries.map(([k, v]) => [k, asCents(v)]));
// Invented: capital 10,000 in; sales 38,450 (GST 3,845); materials 9,812.40; fees 20; phone 258.
const year = m([
  ['acc_bank', 4_113_444],
  ['acc_gst', -277_484],
  ['acc_capital', -1_000_000],
  ['acc_sales', -3_845_000],
  ['acc_mat', 981_240],
  ['acc_fees', 2_000],
  ['acc_phone', 25_800],
]);
const rows = { showEmpty: false, groupSmall: false, showCodes: false };
const range = { from: d('2026-10-01'), to: d('2026-12-31'), label: 'Oct–Dec 2026' };

describe('profit and loss', () => {
  const pl = buildProfitAndLoss({
    accounts,
    periods: [{ key: 'p0', range, totals: year }],
    percentOfIncome: true,
    rows,
  });
  const amount = (key: string) => {
    const cell = pl.rows.find((r) => r.key === key)?.cells[0];
    return cell?.kind === 'money' ? cell.cents : null;
  };

  it('shows income and expenses the natural way round, with net profit', () => {
    expect(amount('acc_sales')).toBe(3_845_000);
    expect(amount('acc_mat')).toBe(981_240);
    expect(amount('total-expenses')).toBe(1_009_040);
    expect(amount('net-profit')).toBe(2_835_960);
    expect(pl.rows.some((r) => r.key === 'acc_idle')).toBe(false);
    expect(pl.columns.map((c) => c.label)).toEqual(['Oct–Dec 2026', '% of income']);
    expect(pl.rows.find((r) => r.key === 'acc_mat')?.cells[1]).toEqual({
      kind: 'percent',
      bp: 2552,
    });
  });

  it('every account figure opens its own lines over its own period', () => {
    expect(pl.rows.find((r) => r.key === 'acc_mat')?.cells[0]).toMatchObject({
      drill: { kind: 'account', accountId: 'acc_mat', from: '2026-10-01', to: '2026-12-31' },
    });
  });

  it('shows empty accounts and codes when asked, and groups small expenses as Other', () => {
    const shown = buildProfitAndLoss({
      accounts,
      periods: [{ key: 'p0', range, totals: year }],
      percentOfIncome: false,
      rows: { showEmpty: true, groupSmall: true, showCodes: true },
    });
    expect(shown.rows.find((r) => r.key === 'acc_sales')?.code).toBe('4000');
    const labels = shown.rows.map((r) => r.label);
    expect(labels).toContain('Other expenses');
    expect(labels).not.toContain('Bank fees');
    expect(labels).toContain('Materials and supplies');
    const other = shown.rows.find((r) => r.key === 'other-expenses')?.cells[0];
    expect(other?.kind === 'money' && other.cents).toBe(27_800);
  });

  it('his own columns: difference, % change, notes and flag', () => {
    const before = m([
      ['acc_sales', -4_800_000],
      ['acc_mat', 1_231_075],
    ]);
    const two = buildProfitAndLoss({
      accounts,
      periods: [
        { key: 'p0', range, totals: year },
        { key: 'p1', range: { ...range, label: 'Jul–Sep 2026' }, totals: before },
      ],
      percentOfIncome: false,
      rows,
    });
    const own = withOwnColumns(
      two.columns,
      two.rows,
      [
        { kind: 'calc', name: 'Change', calc: 'difference', a: 'p0', b: 'p1', amount: null },
        { kind: 'calc', name: '% change', calc: 'percent-change', a: 'p0', b: 'p1', amount: null },
        { kind: 'notes', name: 'Notes', notes: { acc_mat: 'Big timber order' } },
        {
          kind: 'calc',
          name: 'Over $10,000',
          calc: 'flag-over',
          a: 'p0',
          b: null,
          amount: 1_000_000,
        },
      ],
      'total-income',
    );
    const sales = own.rows.find((r) => r.key === 'acc_sales')?.cells ?? [];
    expect(sales.slice(2)).toEqual([
      { kind: 'money', cents: -955_000, drill: null },
      { kind: 'percent', bp: -1990 },
      { kind: 'text', text: '' },
      { kind: 'flag', on: true },
    ]);
    expect(own.rows.find((r) => r.key === 'acc_mat')?.cells[4]).toEqual({
      kind: 'text',
      text: 'Big timber order',
    });
    // Fees had nothing last quarter: a % change of nothing is n/a.
    expect(own.rows.find((r) => r.key === 'acc_fees')?.cells[3]).toEqual({
      kind: 'percent',
      bp: null,
    });
  });
});

describe('balance sheet and trial balance', () => {
  it('the balance sheet balances, and its earnings are the profit', () => {
    const bs = buildBalanceSheet({
      accounts,
      totals: year,
      earlierEarnings: asCents(0),
      yearEarnings: asCents(2_835_960),
      asAt: { ...range, label: 'As at 31/12/2026' },
      rows,
    });
    expect(bs.balanced).toBe(true);
    const cell = (key: string) => bs.rows.find((r) => r.key === key)?.cells[0];
    expect(cell('total-assets')).toMatchObject({ cents: 4_113_444 });
    expect(cell('liabilities-and-equity')).toMatchObject({ cents: 4_113_444 });
    expect(cell('acc_gst')).toMatchObject({
      cents: 277_484,
      drill: { kind: 'account', from: null, to: '2026-12-31' },
    });
  });

  it('says plainly when it does not balance', () => {
    const bs = buildBalanceSheet({
      accounts,
      totals: year,
      earlierEarnings: asCents(0),
      yearEarnings: asCents(0),
      asAt: range,
      rows,
    });
    expect(bs.balanced).toBe(false);
  });

  it('the trial balance has equal debits and credits', () => {
    const tb = buildTrialBalanceReport({ accounts, totals: year, range, rows });
    expect(tb.balanced).toBe(true);
    expect(tb.rows.at(-1)?.cells).toEqual([
      { kind: 'money', cents: 5_122_484, drill: null },
      { kind: 'money', cents: 5_122_484, drill: null },
    ]);
  });
});

describe('the BAS worksheet', () => {
  it('adds up G1, 1A and 1B from the lines, and the GST to pay', () => {
    const figures = basFigures([
      {
        accountType: 'income',
        treatment: 'taxable',
        amount: asCents(-300_000),
        gst: asCents(-30_000),
      },
      { accountType: 'income', treatment: 'gst-free', amount: asCents(-50_000), gst: asCents(0) },
      {
        accountType: 'expense',
        treatment: 'taxable',
        amount: asCents(50_000),
        gst: asCents(5_000),
      },
      { accountType: 'expense', treatment: 'input-taxed', amount: asCents(1_500), gst: asCents(0) },
    ]);
    expect(figures).toEqual({ g1: 380_000, a1: 30_000, b1: 5_000, net: 25_000 });
    const sheet = buildBasWorksheet(figures, range);
    expect(sheet.rows.map((r) => [r.code, r.label])).toEqual([
      ['G1', 'Total sales, including GST'],
      ['1A', 'GST on sales'],
      ['1B', 'GST on purchases'],
      [null, 'GST to pay (1A less 1B)'],
    ]);
    expect(sheet.rows[0]?.cells[0]).toMatchObject({ drill: { kind: 'bas', label: 'G1' } });
  });

  it('a refund is said the other way round, as a positive figure', () => {
    const sheet = buildBasWorksheet(
      { g1: asCents(0), a1: asCents(100), b1: asCents(500), net: asCents(-400) },
      range,
    );
    expect(sheet.rows.at(-1)).toMatchObject({
      label: 'GST to be refunded (1B less 1A)',
      cells: [{ cents: 400 }],
    });
  });
});

describe('CSV export (spec 098)', () => {
  it('never lets a cell be a formula', () => {
    expect(csvText('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
    expect(csvText('+61 400')).toBe("'+61 400");
    expect(csvText('-dash')).toBe("'-dash");
    expect(csvText('@name')).toBe("'@name");
    expect(csvText('BUNNINGS, 4532')).toBe('"BUNNINGS, 4532"');
    expect(csvText('Sales')).toBe('Sales');
  });

  it('writes amounts as plain numbers, a negative with its minus sign', () => {
    expect(csvAmount(asCents(-123450))).toBe('-1234.50');
    expect(csvAmount(asCents(5))).toBe('0.05');
  });

  it('writes a whole report', () => {
    const view: ReportView = {
      title: 'Profit and loss',
      periodText: 'Oct–Dec 2026',
      rowHeading: 'Account',
      from: d('2026-10-01'),
      to: d('2026-12-31'),
      columns: [{ key: 'p0', label: 'Oct–Dec 2026' }],
      rows: [
        { kind: 'heading', key: 'income', label: 'Income', code: null, cells: [{ kind: 'empty' }] },
        {
          kind: 'account',
          key: 'acc_x',
          label: '=cmd|calc',
          code: '4000',
          cells: [{ kind: 'money', cents: asCents(3845000), drill: null }],
        },
      ],
      check: null,
      note: null,
      locked: false,
    };
    expect(reportCsv(view, 'Harbour Lane Joinery Pty Ltd').split('\r\n').slice(0, 7)).toEqual([
      'Harbour Lane Joinery Pty Ltd',
      'Profit and loss',
      'Oct–Dec 2026',
      '',
      'Code,Account,Oct–Dec 2026',
      ',Income,',
      "4000,'=cmd|calc,38450.00",
    ]);
  });
});
