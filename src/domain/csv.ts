// A report as CSV text (spec 098), safe to open in Excel, Numbers or Google Sheets (risk G3).
// Amounts are plain numbers with two decimals and no dollar sign, so a spreadsheet can add them up.
// Dates are DD/MM/YYYY. Any cell that starts with =, +, - or @ (a bank description, a name) is
// kept as text by a leading apostrophe, so a spreadsheet never runs it as a formula; an amount
// is the only thing written with a leading minus, and it is a number, not text.

import { formatDateAU } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { ReportCell, ReportView } from '@shared/reports';
import { percentText } from './report-calcs';

const FORMULA_START = /^[=+\-@\t\r]/;

/** A text cell made safe: never a formula, quoted when it holds a comma, a quote or a new line. */
export function csvText(text: string): string {
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Whole cents as a plain number: -123450 is -1234.50. */
export function csvAmount(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const size = String(Math.abs(cents)).padStart(3, '0');
  return `${sign}${size.slice(0, -2)}.${size.slice(-2)}`;
}

function cellText(cell: ReportCell): string {
  switch (cell.kind) {
    case 'money':
      return csvAmount(cell.cents);
    case 'percent':
      return csvText(percentText(cell.bp));
    case 'text':
      return csvText(cell.text);
    case 'flag':
      return cell.on ? 'Over' : '';
    case 'empty':
      return '';
  }
}

export function reportCsv(view: ReportView, business: string): string {
  const head = [
    [csvText(business)],
    [csvText(view.title)],
    [csvText(view.periodText)],
    [],
    ['Code', csvText(view.rowHeading), ...view.columns.map((c) => csvText(c.label))],
  ];
  const body = view.rows.map((row) => [
    csvText(row.code ?? ''),
    csvText(row.label),
    ...row.cells.map(cellText),
  ]);
  const foot = [
    ...(view.check === null ? [] : [[], [csvText(view.check.text)]]),
    ...(view.note === null ? [] : [[csvText(view.note)]]),
    [csvText(`Made ${formatDateAU(view.to)} period end, from the books.`)],
  ];
  return [...head, ...body, ...foot].map((cells) => cells.join(',')).join('\r\n') + '\r\n';
}
