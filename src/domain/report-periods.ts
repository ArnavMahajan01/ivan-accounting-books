// The periods a report covers (specs 090, 100): the one he picks, and the columns that compare with
// it: the period before, the same period last year, and month by month. Pure: today is given.
//
// "This quarter" and "this financial year" run to today, as the wireframe's "This quarter to date"
// does; "last quarter" and "last financial year" are whole. A quarter is the BAS quarter (July to
// September, and so on), and the year runs 1 July to 30 June.

import {
  addDays,
  compareDates,
  daysBetween,
  formatDateAU,
  parseCalendarDate,
  type CalendarDate,
} from '@shared/dates';
import type { PeriodChoice } from '@shared/reports';
import { basPeriodOf, financialYearOf } from './periods';

export interface Range {
  readonly from: CalendarDate;
  readonly to: CalendarDate;
  /** For a column heading: `Oct–Dec 2026`, `FY 2026–27`, `Nov 2026`, or the two days. */
  readonly label: string;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function day(text: string): CalendarDate {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new RangeError(`Not a real date: ${text}`);
  return parsed.value;
}

const earlier = (a: CalendarDate, b: CalendarDate) => (compareDates(a, b) <= 0 ? a : b);

function customLabel(from: CalendarDate, to: CalendarDate): string {
  return `${formatDateAU(from)} to ${formatDateAU(to)}`;
}

/** The period he picked, or null when custom dates are missing or the wrong way round. */
export function resolvePeriod(
  choice: PeriodChoice,
  today: CalendarDate,
  custom: { readonly from: CalendarDate | null; readonly to: CalendarDate | null },
): Range | null {
  switch (choice) {
    case 'this-quarter': {
      const q = basPeriodOf(today, 'quarterly');
      return { from: q.start, to: earlier(q.end, today), label: q.label };
    }
    case 'last-quarter': {
      const q = basPeriodOf(addDays(basPeriodOf(today, 'quarterly').start, -1), 'quarterly');
      return { from: q.start, to: q.end, label: q.label };
    }
    case 'this-year': {
      const y = financialYearOf(today);
      return { from: y.start, to: earlier(y.end, today), label: y.label };
    }
    case 'last-year': {
      const y = financialYearOf(addDays(financialYearOf(today).start, -1));
      return { from: y.start, to: y.end, label: y.label };
    }
    case 'custom': {
      const { from, to } = custom;
      if (from === null || to === null || compareDates(from, to) > 0) return null;
      return { from, to, label: customLabel(from, to) };
    }
  }
}

/** The same date a year earlier. 29 February becomes 28 February. */
function yearBefore(date: CalendarDate): CalendarDate {
  const year = Number(date.slice(0, 4)) - 1;
  const rest = date.slice(4);
  const parsed = parseCalendarDate(`${String(year).padStart(4, '0')}${rest}`, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : day(`${String(year).padStart(4, '0')}-02-28`);
}

/** The same days a year before, labelled like the period it compares with. */
export function sameLastYear(range: Range): Range {
  const from = yearBefore(range.from);
  const to = yearBefore(range.to);
  const quarter = basPeriodOf(from, 'quarterly');
  const label =
    quarter.start === from && compareDates(to, quarter.end) <= 0
      ? quarter.label
      : financialYearOf(from).start === from
        ? financialYearOf(from).label
        : customLabel(from, to);
  return { from, to, label };
}

/** The period just before: the quarter or year before a quarter or year, or as many days before. */
export function periodBefore(range: Range): Range {
  const quarter = basPeriodOf(range.from, 'quarterly');
  if (quarter.start === range.from) {
    const before = basPeriodOf(addDays(range.from, -1), 'quarterly');
    if (compareDates(range.to, quarter.end) <= 0 && daysBetween(range.from, range.to) <= 92) {
      return { from: before.start, to: before.end, label: before.label };
    }
  }
  const year = financialYearOf(range.from);
  if (year.start === range.from) {
    const before = financialYearOf(addDays(range.from, -1));
    return { from: before.start, to: before.end, label: before.label };
  }
  const length = daysBetween(range.from, range.to);
  const to = addDays(range.from, -1);
  const from = addDays(to, -length);
  return { from, to, label: customLabel(from, to) };
}

/** Each calendar month the period touches, cut to the period: `Jul 2026`, `Aug 2026` … */
export function monthsOf(range: Range): Range[] {
  const months: Range[] = [];
  let start = range.from;
  while (compareDates(start, range.to) <= 0) {
    const y = Number(start.slice(0, 4));
    const m = Number(start.slice(5, 7));
    const next = day(
      `${String(m === 12 ? y + 1 : y)}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`,
    );
    const end = earlier(addDays(next, -1), range.to);
    months.push({ from: start, to: end, label: `${SHORT_MONTHS[m - 1] ?? ''} ${String(y)}` });
    start = next;
  }
  return months;
}
