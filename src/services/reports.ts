// Reports (specs 089 to 095, 100, 102): any report built from the books for a request, and the
// lines behind any figure (spec 093). Read only: a report never changes the books.

import { listAccounts } from '@data/account-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { getBusiness } from '@data/business-repository';
import { accountLines, linesWithTaxCode, type ReportLine } from '@data/report-queries';
import { basContributions } from '@domain/bas-labels';
import { basFigures } from '@domain/bas';
import { isLocked } from '@domain/journal';
import { financialYearOf } from '@domain/periods';
import {
  buildBalanceSheet,
  buildBasWorksheet,
  buildProfitAndLoss,
  buildTrialBalanceReport,
  natural,
  withOwnColumns,
  type PeriodColumn,
  type ReportAccount,
} from '@domain/report-build';
import {
  monthsOf,
  periodBefore,
  resolvePeriod,
  sameLastYear,
  type Range,
} from '@domain/report-periods';
import { addDays, formatDateAU, parseCalendarDate, type CalendarDate } from '@shared/dates';
import { asCents, negateCents, sumCents, type Cents } from '@shared/money';
import { REPORT_TITLES, type Drill, type ReportRequest, type ReportView } from '@shared/reports';
import { err, ok, type Result } from '@shared/result';
import type { DrillView } from '@shared/views';
import type { TodayContext } from './context';

export const BAS_FOOTNOTE =
  'For you or your accountant to fill in the BAS. The app does not lodge anything with the ATO.';

function readDate(text: string | null): CalendarDate | null {
  if (text === null) return null;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : null;
}

function totalsFor(
  ctx: TodayContext,
  from: CalendarDate | null,
  to: CalendarDate,
): Map<string, Cents> {
  return new Map(
    sumLinesByAccount(ctx.db, { from, to }).map((t) => [t.accountId as string, t.total]),
  );
}

/** Income less expenses over the totals: what the business earned. */
function earnings(accounts: readonly ReportAccount[], totals: ReadonlyMap<string, Cents>): Cents {
  return negateCents(
    sumCents(
      accounts
        .filter((a) => a.type === 'income' || a.type === 'expense')
        .map((a) => totals.get(a.id) ?? asCents(0)),
    ),
  );
}

const withDates = (range: Range) =>
  range.label.includes('/')
    ? range.label
    : `${range.label}, ${formatDateAU(range.from)} to ${formatDateAU(range.to)}`;

export type ReportError = 'bad-period' | 'not-set-up';

export function getReport(
  ctx: TodayContext,
  request: ReportRequest,
): Result<ReportView, ReportError> {
  const business = getBusiness(ctx.db);
  if (business === null) return err('not-set-up');
  const accounts: ReportAccount[] = listAccounts(ctx.db).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    active: a.active,
  }));
  const today = ctx.clock.today();
  const lockedTo = (to: CalendarDate) => isLocked(to, business.lockDate);
  const title = REPORT_TITLES[request.report];

  if (request.report === 'balance-sheet') {
    const asAt = readDate(request.asAt) ?? today;
    const year = financialYearOf(asAt);
    const built = buildBalanceSheet({
      accounts,
      totals: totalsFor(ctx, null, asAt),
      earlierEarnings: earnings(accounts, totalsFor(ctx, null, addDays(year.start, -1))),
      yearEarnings: earnings(accounts, totalsFor(ctx, year.start, asAt)),
      asAt: { from: year.start, to: asAt, label: `As at ${formatDateAU(asAt)}` },
      rows: request.rows,
    });
    return ok({
      title,
      periodText: `As at ${formatDateAU(asAt)}`,
      from: null,
      to: asAt,
      columns: built.columns,
      rows: built.rows,
      check: built.balanced
        ? { ok: true, text: 'Assets equal liabilities plus equity.' }
        : {
            ok: false,
            text: 'Assets do not equal liabilities plus equity. Check the books in Settings.',
          },
      note: null,
      locked: lockedTo(asAt),
    });
  }

  const base = resolvePeriod(request.period.choice, today, {
    from: readDate(request.period.from),
    to: readDate(request.period.to),
  });
  if (base === null) return err('bad-period');

  if (request.report === 'trial-balance') {
    // As at the period's end, from the start of the books, so debits always equal credits.
    const built = buildTrialBalanceReport({
      accounts,
      totals: totalsFor(ctx, null, base.to),
      range: { from: base.from, to: base.to, label: base.label },
      rows: request.rows,
    });
    return ok({
      title,
      periodText: `As at ${formatDateAU(base.to)}`,
      from: null,
      to: base.to,
      columns: built.columns,
      rows: built.rows.map((r) => ({
        ...r,
        cells: r.cells.map((c) =>
          c.kind === 'money' && c.drill?.kind === 'account'
            ? { ...c, drill: { ...c.drill, from: null } }
            : c,
        ),
      })),
      check: built.balanced
        ? { ok: true, text: 'Balanced: debits equal credits.' }
        : {
            ok: false,
            text: 'Not balanced: debits do not equal credits. Check the books in Settings.',
          },
      note: null,
      locked: lockedTo(base.to),
    });
  }

  if (request.report === 'bas') {
    const lines = linesWithTaxCode(ctx.db, base.from, base.to).flatMap((l) =>
      l.treatment === null
        ? []
        : [{ accountType: l.accountType, treatment: l.treatment, amount: l.amount, gst: l.gst }],
    );
    const built = buildBasWorksheet(basFigures(lines), base);
    const basis =
      business.gstBasis === 'cash'
        ? 'Cash basis, simpler BAS.'
        : 'Accrual basis, simpler BAS. Invoices and bills arrive in a later version; until then the same lines are counted.';
    return ok({
      title,
      periodText: withDates(base),
      from: base.from,
      to: base.to,
      columns: built.columns,
      rows: built.rows,
      check: null,
      note: `${basis} ${BAS_FOOTNOTE}`,
      locked: lockedTo(base.to),
    });
  }

  // Profit and loss, with any comparison columns he chose.
  const ranges: { key: string; range: Range }[] = request.columns.monthByMonth
    ? monthsOf(base).map((range, i) => ({ key: `m${String(i)}`, range }))
    : [
        { key: 'p0', range: base },
        ...(request.columns.lastPeriod ? [{ key: 'p1', range: periodBefore(base) }] : []),
        ...(request.columns.sameLastYear ? [{ key: 'p2', range: sameLastYear(base) }] : []),
      ];
  const periods: PeriodColumn[] = ranges.map(({ key, range }) => ({
    key,
    range,
    totals: totalsFor(ctx, range.from, range.to),
  }));
  const built = buildProfitAndLoss({
    accounts,
    periods,
    percentOfIncome: request.columns.percentOfIncome,
    rows: request.rows,
  });
  const withOwn = withOwnColumns(built.columns, built.rows, request.ownColumns, 'total-income');
  return ok({
    title,
    periodText: withDates(base),
    from: base.from,
    to: base.to,
    columns: withOwn.columns,
    rows: withOwn.rows,
    check: null,
    note: null,
    locked: lockedTo(base.to),
  });
}

/** The lines behind a figure (spec 093). Their total is always the figure. */
export function getReportLines(ctx: TodayContext, drill: Drill): DrillView {
  if (drill.kind === 'account') {
    const lines = accountLines(ctx.db, drill.accountId, drill.from, drill.to);
    const shown = lines.map((l) => {
      const way = (cents: Cents) =>
        drill.side === 'natural'
          ? natural(l.accountType, cents)
          : drill.side === 'debit'
            ? cents
            : negateCents(cents);
      const beforeGst = way(l.amount);
      const gst = way(l.gst);
      return { ...rowOf(l), beforeGst, gst, total: asCents(beforeGst + gst) };
    });
    return {
      title: `${lines[0]?.accountName ?? 'Account'}, ${drill.from === null ? 'up to' : `${formatDateAU(drill.from)} to`} ${formatDateAU(drill.to)}`,
      lines: shown,
      total: sumCents(shown.map((l) => l.beforeGst)),
      totalLabel: 'Total, before GST',
      accountId: drill.accountId,
    };
  }
  const shown = linesWithTaxCode(ctx.db, drill.from, drill.to).flatMap((l) => {
    if (l.treatment === null) return [];
    const part = basContributions({
      accountType: l.accountType,
      treatment: l.treatment,
      amount: l.amount,
      gst: l.gst,
    }).find((c) => c.label === drill.label);
    return part === undefined
      ? []
      : [{ ...rowOf(l), beforeGst: part.cents, gst: asCents(0), total: part.cents }];
  });
  return {
    title: `${drill.label}, ${formatDateAU(drill.from)} to ${formatDateAU(drill.to)}`,
    lines: shown,
    total: sumCents(shown.map((l) => l.beforeGst)),
    totalLabel: `Total for ${drill.label}`,
    accountId: null,
  };
}

function rowOf(l: ReportLine) {
  return {
    entryId: l.entryId,
    date: l.date,
    payee: l.payee,
    description: l.memo,
    account: l.accountName,
  };
}
