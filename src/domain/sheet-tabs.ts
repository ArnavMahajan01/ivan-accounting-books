// What a published workbook holds (specs 110 to 113): a report, or the transaction list, as rows of
// cells for the app's tab. Pure. Each app tab starts with heading rows saying it is a copy from the
// books made on a day, and which rows and columns the app refreshes, so his own work goes beside it.
//
// A workbook is for one report and one period. "This quarter" is pinned to the whole quarter
// (Oct–Dec 2026), so publishing again in December refreshes the same workbook, and January's
// quarter gets its own.

import { addDays, formatDateAU, type CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { PeriodChoice, ReportCell, ReportView } from '@shared/reports';
import { percentText } from './report-calcs';
import { basPeriodOf, financialYearOf } from './periods';
import { columnLetters, type AppTab, type SheetCell } from './workbook';

/** A period fixed to its whole span: what a workbook is named after and keyed on. */
export interface PinnedPeriod {
  readonly from: CalendarDate;
  readonly to: CalendarDate;
  /** `Oct–Dec 2026`, `FY 2026–27`, or the two days. */
  readonly label: string;
}

/** The whole quarter or year he picked, or his own days. Null for missing or backwards days. */
export function pinPeriod(
  choice: PeriodChoice,
  today: CalendarDate,
  custom: { readonly from: CalendarDate | null; readonly to: CalendarDate | null },
): PinnedPeriod | null {
  switch (choice) {
    case 'this-quarter': {
      const q = basPeriodOf(today, 'quarterly');
      return { from: q.start, to: q.end, label: q.label };
    }
    case 'last-quarter': {
      const q = basPeriodOf(addDays(basPeriodOf(today, 'quarterly').start, -1), 'quarterly');
      return { from: q.start, to: q.end, label: q.label };
    }
    case 'this-year': {
      const y = financialYearOf(today);
      return { from: y.start, to: y.end, label: y.label };
    }
    case 'last-year': {
      const y = financialYearOf(addDays(financialYearOf(today).start, -1));
      return { from: y.start, to: y.end, label: y.label };
    }
    case 'custom': {
      const { from, to } = custom;
      if (from === null || to === null || from > to) return null;
      return { from, to, label: `${formatDateAU(from)} to ${formatDateAU(to)}` };
    }
  }
}

/** "Profit and loss · Oct–Dec 2026": the workbook's name in Drive and in the app. */
export function workbookTitle(report: string, label: string): string {
  return `${report} · ${label}`;
}

const text = (t: string): SheetCell => ({ kind: 'text', text: t });
const EMPTY: SheetCell = { kind: 'empty' };

/** The heading rows on every app tab, then a blank row. */
function headingRows(
  business: string,
  title: string,
  periodText: string,
  publishedOn: CalendarDate,
  columns: number,
  rows: number,
): SheetCell[][] {
  return [
    [text(business)],
    [text(`${title}, ${periodText}`)],
    [
      text(
        `Published from Accounting Books on ${formatDateAU(publishedOn)}. A copy of the books: changing it here does not change them. ` +
          `Publishing again refreshes rows 1 to ${String(rows)} of columns A to ${columnLetters(columns - 1)}; your own columns, rows below and tabs are kept.`,
      ),
    ],
    [EMPTY],
  ];
}
const HEADING_ROWS = 4;

function reportCell(cell: ReportCell): SheetCell {
  switch (cell.kind) {
    case 'money':
      return { kind: 'amount', cents: cell.cents };
    case 'percent':
      return text(percentText(cell.bp));
    case 'text':
      return cell.text === '' ? EMPTY : text(cell.text);
    case 'flag':
      return cell.on ? text('Over') : EMPTY;
    case 'empty':
      return EMPTY;
  }
}

/** A report as the app's `report` tab: a name column, then one column per figure column. */
export function reportTab(view: ReportView, business: string, publishedOn: CalendarDate): AppTab {
  const columns = 1 + view.columns.length;
  const table: SheetCell[][] = [
    [text(view.rowHeading), ...view.columns.map((c) => text(c.label))],
    ...view.rows.map((row) => [
      text(row.code === null ? row.label : `${row.code} ${row.label}`),
      ...row.cells.map(reportCell),
    ]),
  ];
  const foot: SheetCell[][] = [
    ...(view.check === null ? [] : [[EMPTY], [text(view.check.text)]]),
    ...(view.note === null ? [] : [[text(view.note)]]),
  ];
  const rows = HEADING_ROWS + table.length + foot.length;
  return {
    key: 'report',
    title: view.title,
    columns,
    rows: [
      ...headingRows(business, view.title, view.periodText, publishedOn, columns, rows),
      ...table,
      ...foot,
    ],
    editable: null,
  };
}

/** One posted entry as a row of the Transactions tab. */
export interface SheetTransaction {
  /** The entry's id: the row's key, in the Ref column. */
  readonly ref: string;
  readonly date: CalendarDate;
  readonly description: string;
  readonly payee: string | null;
  /** Money in is positive, money out negative, as on the statement. */
  readonly amount: Cents;
  /** The account's name, or "Split" when it went to more than one. */
  readonly account: string;
  /** The GST code's short code, or blank. */
  readonly gst: string;
  readonly note: string;
}

/** The columns of the Transactions tab. Account, GST and Note are the ones an editor may change. */
export const TRANSACTION_COLUMNS = [
  'Date',
  'Description',
  'Payee',
  'Amount',
  'Account',
  'GST',
  'Note',
  'Ref (do not change)',
] as const;
export const EDITABLE_TRANSACTION_COLUMNS = { account: 4, gst: 5, note: 6 } as const;
export const REF_COLUMN = 7;
/** The row (0-based) the Transactions tab's first transaction is on. */
export const FIRST_TRANSACTION_ROW = HEADING_ROWS + 1;

export function transactionsTab(
  lines: readonly SheetTransaction[],
  business: string,
  periodText: string,
  publishedOn: CalendarDate,
): AppTab {
  const columns = TRANSACTION_COLUMNS.length;
  const rows = FIRST_TRANSACTION_ROW + lines.length;
  return {
    key: 'transactions',
    title: 'Transactions',
    columns,
    rows: [
      ...headingRows(business, 'Transactions', periodText, publishedOn, columns, rows),
      TRANSACTION_COLUMNS.map(text),
      ...lines.map((l) => [
        { kind: 'date' as const, date: l.date },
        text(l.description),
        l.payee === null ? EMPTY : text(l.payee),
        { kind: 'amount' as const, cents: l.amount },
        text(l.account),
        l.gst === '' ? EMPTY : text(l.gst),
        l.note === '' ? EMPTY : text(l.note),
        text(l.ref),
      ]),
    ],
    editable: {
      fromRow: FIRST_TRANSACTION_ROW,
      columns: Object.values(EDITABLE_TRANSACTION_COLUMNS),
    },
  };
}
