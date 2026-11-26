// The reports, built from account totals (specs 089 to 095, 100, 102). Pure: the caller reads the
// totals. Amounts are shown the natural way round, as in his QuickBooks reports: income, expenses,
// assets, liabilities and equity are each positive when they hold what they usually hold.
//
// Each account figure carries the range it covers, so the screen can open the lines behind it
// (spec 093), and the lines' total is always the figure.

import { asCents, negateCents, sumCents, type Cents } from '@shared/money';
import type { AccountType, BasLabel } from '@shared/kinds';
import type { Drill, OwnColumn, ReportCell, ReportColumn, ReportRow } from '@shared/reports';
import type { BasFigures } from './bas';
import { difference, flagOver, gstInside, percentChange, percentOfIncome } from './report-calcs';
import type { Range } from './report-periods';

export interface ReportAccount {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  readonly active: boolean;
}

/** One money column: its period, and each account's lines added up over it (debit positive). */
export interface PeriodColumn {
  readonly key: string;
  readonly range: Range;
  readonly totals: ReadonlyMap<string, Cents>;
}

export interface RowOptions {
  readonly showEmpty: boolean;
  readonly groupSmall: boolean;
  readonly showCodes: boolean;
}

/** An expense smaller than this share of income goes into "Other expenses" when grouping. */
export const SMALL_EXPENSE_BP = 200;

const ZERO = asCents(0);

/** The account's amount the natural way round: credits positive for income, liabilities and equity. */
export function natural(type: AccountType, total: Cents): Cents {
  return type === 'income' || type === 'liability' || type === 'equity'
    ? negateCents(total)
    : total;
}

const money = (cents: Cents, drill: Drill | null): ReportCell => ({ kind: 'money', cents, drill });
const empty: ReportCell = { kind: 'empty' };

function centsOf(cell: ReportCell | undefined): Cents | null {
  return cell?.kind === 'money' ? cell.cents : null;
}

/** Adds his own columns (spec 102) to rows whose money columns are known by key. */
export function withOwnColumns(
  columns: readonly ReportColumn[],
  rows: readonly ReportRow[],
  own: readonly OwnColumn[],
  incomeRowKey: string,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const at = (key: string) => columns.findIndex((c) => c.key === key);
  const income = rows.find((r) => r.key === incomeRowKey);
  const outColumns = [
    ...columns,
    ...own.map((c, i) => ({ key: `own${String(i)}`, label: c.name })),
  ];
  const outRows = rows.map((row) => {
    const extra = own.map((c): ReportCell => {
      if (row.kind === 'heading') return empty;
      if (c.kind === 'notes')
        return row.kind === 'account' ? { kind: 'text', text: c.notes[row.key] ?? '' } : empty;
      const a = centsOf(row.cells[at(c.a)]);
      const b = c.b === null ? null : centsOf(row.cells[at(c.b)]);
      if (a === null) return empty;
      switch (c.calc) {
        case 'difference':
          return b === null ? empty : money(difference(a, b), null);
        case 'percent-change':
          return b === null ? empty : { kind: 'percent', bp: percentChange(a, b) };
        case 'percent-of-income': {
          const total = centsOf(income?.cells[at(c.a)]);
          return { kind: 'percent', bp: total === null ? null : percentOfIncome(a, total) };
        }
        case 'gst-inside':
          return money(gstInside(a), null);
        case 'flag-over':
          return { kind: 'flag', on: c.amount !== null && flagOver(a, asCents(c.amount)) };
      }
    });
    return { ...row, cells: [...row.cells, ...extra] };
  });
  return { columns: outColumns, rows: outRows };
}

/** Profit and loss (spec 090), with comparison columns (spec 100). */
export function buildProfitAndLoss(input: {
  readonly accounts: readonly ReportAccount[];
  readonly periods: readonly PeriodColumn[];
  readonly percentOfIncome: boolean;
  readonly rows: RowOptions;
}): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { periods, rows: options } = input;
  const amountsOf = (a: ReportAccount) =>
    periods.map((p) => natural(a.type, p.totals.get(a.id) ?? ZERO));
  const accountRow = (a: ReportAccount): ReportRow => ({
    kind: 'account',
    key: a.id,
    label: a.name,
    code: options.showCodes ? a.code : null,
    cells: periods.map((p, i) =>
      money(amountsOf(a)[i] ?? ZERO, {
        kind: 'account',
        accountId: a.id,
        side: 'natural',
        from: p.range.from,
        to: p.range.to,
      }),
    ),
  });
  const section = (type: AccountType) =>
    input.accounts
      .filter((a) => a.type === type)
      .filter((a) => amountsOf(a).some((c) => c !== 0) || (options.showEmpty && a.active))
      .sort((x, y) => x.code.localeCompare(y.code, 'en-AU', { numeric: true }));
  const totalOf = (list: readonly ReportAccount[]) =>
    periods.map((_, i) => sumCents(list.map((a) => amountsOf(a)[i] ?? ZERO)));

  const income = section('income');
  const expenses = section('expense');
  const incomeTotal = totalOf(income);
  const expenseTotal = totalOf(expenses);

  // Small expenses grouped as "Other expenses": under 2% of the first column's income.
  let shownExpenses: ReportRow[] = expenses.map(accountRow);
  const first = incomeTotal[0] ?? ZERO;
  if (options.groupSmall && first > 0) {
    const small = expenses.filter(
      (a) => Math.abs(amountsOf(a)[0] ?? 0) * 10_000 < first * SMALL_EXPENSE_BP,
    );
    if (small.length > 1) {
      const smallIds = new Set(small.map((a) => a.id));
      shownExpenses = [
        ...expenses.filter((a) => !smallIds.has(a.id)).map(accountRow),
        {
          kind: 'account',
          key: 'other-expenses',
          label: 'Other expenses',
          code: null,
          cells: totalOf(small).map((c) => money(c, null)),
        },
      ];
    }
  }

  const heading = (key: string, label: string): ReportRow => ({
    kind: 'heading',
    key,
    label,
    code: null,
    cells: periods.map(() => empty),
  });
  const total = (
    key: string,
    label: string,
    amounts: readonly Cents[],
    kind: 'total' | 'grand' = 'total',
  ): ReportRow => ({
    kind,
    key,
    label,
    code: null,
    cells: amounts.map((c) => money(c, null)),
  });
  const net = periods.map((_, i) => asCents((incomeTotal[i] ?? 0) - (expenseTotal[i] ?? 0)));

  let rows: ReportRow[] = [
    heading('income', 'Income'),
    ...income.map(accountRow),
    total('total-income', 'Total income', incomeTotal),
    heading('expenses', 'Expenses'),
    ...shownExpenses,
    total('total-expenses', 'Total expenses', expenseTotal),
    total('net-profit', 'Net profit', net, 'grand'),
  ];
  const columns: ReportColumn[] = periods.map((p) => ({ key: p.key, label: p.range.label }));
  if (input.percentOfIncome) {
    columns.push({ key: 'pct', label: '% of income' });
    rows = rows.map((row) => ({
      ...row,
      cells: [
        ...row.cells,
        row.kind === 'heading'
          ? empty
          : { kind: 'percent', bp: percentOfIncome(centsOf(row.cells[0]) ?? ZERO, first) },
      ],
    }));
  }
  return { columns, rows };
}

/** Balance sheet as at a day (spec 091). Earnings are worked out from income and expenses. */
export function buildBalanceSheet(input: {
  readonly accounts: readonly ReportAccount[];
  /** Every line up to the day, by account. */
  readonly totals: ReadonlyMap<string, Cents>;
  /** Income less expenses before the financial year the day is in, and in it up to the day. */
  readonly earlierEarnings: Cents;
  readonly yearEarnings: Cents;
  readonly asAt: Range;
  readonly rows: RowOptions;
}): { columns: ReportColumn[]; rows: ReportRow[]; balanced: boolean } {
  const { accounts, totals, rows: options, asAt } = input;
  const amount = (a: ReportAccount) => natural(a.type, totals.get(a.id) ?? ZERO);
  const list = (type: AccountType) =>
    accounts
      .filter((a) => a.type === type && (amount(a) !== 0 || (options.showEmpty && a.active)))
      .sort((x, y) => x.code.localeCompare(y.code, 'en-AU', { numeric: true }));
  const row = (a: ReportAccount): ReportRow => ({
    kind: 'account',
    key: a.id,
    label: a.name,
    code: options.showCodes ? a.code : null,
    cells: [
      money(amount(a), {
        kind: 'account',
        accountId: a.id,
        side: 'natural',
        from: null,
        to: asAt.to,
      }),
    ],
  });
  const line = (
    key: string,
    label: string,
    cents: Cents,
    kind: ReportRow['kind'] = 'total',
  ): ReportRow => ({
    kind,
    key,
    label,
    code: null,
    cells: [money(cents, null)],
  });
  const heading = (key: string, label: string): ReportRow => ({
    kind: 'heading',
    key,
    label,
    code: null,
    cells: [empty],
  });

  const assets = list('asset');
  const liabilities = list('liability');
  const equity = list('equity');
  const totalAssets = sumCents(assets.map(amount));
  const totalLiabilities = sumCents(liabilities.map(amount));
  const earnings: ReportRow[] = [
    ...(input.earlierEarnings !== 0
      ? [line('earlier-earnings', 'Earnings from earlier years', input.earlierEarnings, 'account')]
      : []),
    line('year-earnings', 'Current year earnings', input.yearEarnings, 'account'),
  ];
  const totalEquity = asCents(
    sumCents(equity.map(amount)) + input.earlierEarnings + input.yearEarnings,
  );
  const both = asCents(totalLiabilities + totalEquity);
  return {
    columns: [{ key: 'p0', label: asAt.label }],
    rows: [
      heading('assets', 'Assets'),
      ...assets.map(row),
      line('total-assets', 'Total assets', totalAssets),
      heading('liabilities', 'Liabilities'),
      ...liabilities.map(row),
      line('total-liabilities', 'Total liabilities', totalLiabilities),
      heading('equity', 'Equity'),
      ...equity.map(row),
      ...earnings,
      line('total-equity', 'Total equity', totalEquity),
      line('liabilities-and-equity', 'Liabilities and equity', both, 'grand'),
    ],
    balanced: totalAssets === both,
  };
}

/** Trial balance for a period (spec 092): each account's net debit or credit, and the totals. */
export function buildTrialBalanceReport(input: {
  readonly accounts: readonly ReportAccount[];
  readonly totals: ReadonlyMap<string, Cents>;
  readonly range: Range;
  readonly rows: RowOptions;
}): { columns: ReportColumn[]; rows: ReportRow[]; balanced: boolean } {
  const { accounts, totals, range } = input;
  const listed = accounts
    .filter((a) => (totals.get(a.id) ?? 0) !== 0 || (input.rows.showEmpty && a.active))
    .sort((x, y) => x.code.localeCompare(y.code, 'en-AU', { numeric: true }));
  const drill = (a: ReportAccount, side: 'debit' | 'credit'): Drill => ({
    kind: 'account',
    accountId: a.id,
    side,
    from: range.from,
    to: range.to,
  });
  const rows: ReportRow[] = listed.map((a) => {
    const t = totals.get(a.id) ?? ZERO;
    return {
      kind: 'account',
      key: a.id,
      label: a.name,
      code: a.code,
      cells: [
        t > 0 ? money(t, drill(a, 'debit')) : empty,
        t < 0 ? money(negateCents(t), drill(a, 'credit')) : empty,
      ],
    };
  });
  const debit = sumCents(listed.map((a) => asCents(Math.max(0, totals.get(a.id) ?? 0))));
  const credit = sumCents(
    listed.map((a) => asCents(Math.max(0, negateCents(totals.get(a.id) ?? ZERO)))),
  );
  return {
    columns: [
      { key: 'debit', label: 'Debit' },
      { key: 'credit', label: 'Credit' },
    ],
    rows: [
      ...rows,
      {
        kind: 'grand',
        key: 'totals',
        label: 'Totals',
        code: null,
        cells: [money(debit, null), money(credit, null)],
      },
    ],
    balanced: debit === credit,
  };
}

const BAS_NAMES: Record<BasLabel, string> = {
  G1: 'Total sales, including GST',
  '1A': 'GST on sales',
  '1B': 'GST on purchases',
};

/** The BAS worksheet (spec 095): G1, 1A and 1B, each opening its lines, and the GST to pay. */
export function buildBasWorksheet(
  figures: BasFigures,
  range: Range,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const label = (code: BasLabel, cents: Cents): ReportRow => ({
    kind: 'account',
    key: code,
    label: BAS_NAMES[code],
    code,
    cells: [money(cents, { kind: 'bas', label: code, from: range.from, to: range.to })],
  });
  const pay = figures.net >= 0;
  return {
    columns: [{ key: 'p0', label: 'Amount' }],
    rows: [
      label('G1', figures.g1),
      label('1A', figures.a1),
      label('1B', figures.b1),
      {
        kind: 'grand',
        key: 'net',
        label: pay ? 'GST to pay (1A less 1B)' : 'GST to be refunded (1B less 1A)',
        code: null,
        cells: [money(pay ? figures.net : negateCents(figures.net), null)],
      },
    ],
  };
}
