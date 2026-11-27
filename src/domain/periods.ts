// The Australian financial year and BAS periods, worked out in one place (context/code-standards.md,
// "Dates"). The financial year runs 1 July to 30 June. Source: ATO, "Preparing your tax return"
// (checked 2026-11-22, recorded in the au-bookkeeping-rules skill). BAS months are calendar
// months, and BAS quarters are Jul to Sep, Oct to Dec, Jan to Mar and Apr to Jun.
// Everything is integer arithmetic on year, month and day: never a `Date`, which shifts the day.

import { addDays, parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { BasFrequency } from '@shared/kinds';
import { assertNever } from '@shared/kinds';

export interface FinancialYear {
  /** The calendar year it starts in: 2026 for FY 2026–27. */
  readonly startYear: number;
  /** 1 July. */
  readonly start: CalendarDate;
  /** 30 June of the next year. */
  readonly end: CalendarDate;
  /** `FY 2026–27`, with an en dash. */
  readonly label: string;
}

export interface BasPeriod {
  readonly frequency: BasFrequency;
  readonly start: CalendarDate;
  readonly end: CalendarDate;
  /** `July 2026` for a month, `Jul–Sep 2026` for a quarter. */
  readonly label: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Builds a date from numbers known to be real. A bad one is a bug here, so it throws. */
function dateOf(year: number, month: number, day: number): CalendarDate {
  const text = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new RangeError(`Not a real date: ${text}`);
  return parsed.value;
}

/** The first day of a month, where `month` may run past 12 into the next year. */
function monthStart(year: number, month: number): CalendarDate {
  return dateOf(year + Math.floor((month - 1) / 12), ((month - 1) % 12) + 1, 1);
}

function monthEnd(year: number, month: number): CalendarDate {
  return addDays(monthStart(year, month + 1), -1);
}

function yearAndMonth(date: CalendarDate): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

function financialYearStarting(startYear: number): FinancialYear {
  return {
    startYear,
    start: dateOf(startYear, 7, 1),
    end: dateOf(startYear + 1, 6, 30),
    label: `FY ${String(startYear)}–${String(startYear + 1).slice(-2)}`,
  };
}

/** The financial year that contains a date. 30 June 2027 is FY 2026–27, and 1 July 2027 is FY 2027–28. */
export function financialYearOf(date: CalendarDate): FinancialYear {
  const { year, month } = yearAndMonth(date);
  return financialYearStarting(month >= 7 ? year : year - 1);
}

function monthPeriod(year: number, month: number): BasPeriod {
  return {
    frequency: 'monthly',
    start: monthStart(year, month),
    end: monthEnd(year, month),
    label: `${MONTH_NAMES[(month - 1) % 12] ?? ''} ${String(year + Math.floor((month - 1) / 12))}`,
  };
}

function quarterPeriod(year: number, firstMonth: number): BasPeriod {
  const first = MONTH_NAMES[firstMonth - 1] ?? '';
  const last = MONTH_NAMES[firstMonth + 1] ?? '';
  return {
    frequency: 'quarterly',
    start: monthStart(year, firstMonth),
    end: monthEnd(year, firstMonth + 2),
    label: `${first.slice(0, 3)}–${last.slice(0, 3)} ${String(year)}`,
  };
}

/** The BAS month or quarter that contains a date. */
export function basPeriodOf(date: CalendarDate, frequency: BasFrequency): BasPeriod {
  const { year, month } = yearAndMonth(date);
  switch (frequency) {
    case 'monthly':
      return monthPeriod(year, month);
    case 'quarterly':
      // Quarters start in January, April, July and October.
      return quarterPeriod(year, Math.floor((month - 1) / 3) * 3 + 1);
    default:
      return assertNever(frequency);
  }
}

/** Every BAS period of a financial year, in order: 12 months or 4 quarters, with no gaps. */
export function basPeriodsOfYear(year: FinancialYear, frequency: BasFrequency): BasPeriod[] {
  switch (frequency) {
    case 'monthly':
      return Array.from({ length: 12 }, (_, i) => monthPeriod(year.startYear, 7 + i));
    case 'quarterly':
      return [
        quarterPeriod(year.startYear, 7),
        quarterPeriod(year.startYear, 10),
        quarterPeriod(year.startYear + 1, 1),
        quarterPeriod(year.startYear + 1, 4),
      ];
    default:
      return assertNever(frequency);
  }
}

/**
 * The usual day a BAS period's statement is due when he lodges it himself (ATO, "Due dates for
 * lodging and paying your BAS", in .claude/skills/au-bookkeeping-rules): a quarter ending in
 * September, March or June is due on the 28th of the month after; the October to December quarter
 * on 28 February; a month on the 21st of the next month. A day on a weekend or public holiday moves
 * to the next business day, and an agent may have later dates: this is the usual date only.
 */
export function basDueDate(period: BasPeriod): CalendarDate {
  const { year, month } = yearAndMonth(period.end);
  if (period.frequency === 'monthly')
    return dayOf(year + Math.floor(month / 12), (month % 12) + 1, 21);
  if (month === 12) return dayOf(year + 1, 2, 28);
  return dayOf(year, month + 1, 28);
}

function dayOf(year: number, month: number, day: number): CalendarDate {
  const text = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new RangeError(`Not a real date: ${text}`);
  return parsed.value;
}
