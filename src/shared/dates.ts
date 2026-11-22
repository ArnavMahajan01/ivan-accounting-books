// Calendar dates are `YYYY-MM-DD` strings, never `Date` objects (context/code-standards.md).
// A `Date` is a moment in UTC, and Australia is ahead of UTC, so turning one into a day can
// shift it. Every helper here is plain integer arithmetic on year, month and day.

import { err, ok, type Result } from './result';

declare const calendarDateBrand: unique symbol;
declare const timestampBrand: unique symbol;

/** A day on the calendar, `YYYY-MM-DD`, with no time and no time zone. */
export type CalendarDate = string & { readonly [calendarDateBrand]: true };
/** A moment, as a UTC ISO string: `2026-11-21T03:04:05.000Z`. */
export type Timestamp = string & { readonly [timestampBrand]: true };

/** The date layouts bank files use. Australian dates are day first. */
export type DateFormat = 'DD/MM/YYYY' | 'D/M/YYYY' | 'YYYY-MM-DD' | 'YYYYMMDD';

export type DateParseErrorCode = 'not-a-date' | 'impossible-date';

export interface DateParseError {
  readonly code: DateParseErrorCode;
  readonly text: string;
}

/** Where "today" and "now" come from. Code that needs the time takes a Clock, so tests can fix it. */
export interface Clock {
  /** The Mac's local calendar date, which is Australian time for this client. */
  today(): CalendarDate;
  now(): Timestamp;
}

const PATTERNS: Record<DateFormat, RegExp> = {
  'DD/MM/YYYY': /^(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4})$/,
  'D/M/YYYY': /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/,
  'YYYY-MM-DD': /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/,
  YYYYMMDD: /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})$/,
};

const MIN_YEAR = 1;
const MAX_YEAR = 9999;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isRealDay(year: number, month: number, day: number): boolean {
  return (
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function toCalendarDate(year: number, month: number, day: number): CalendarDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as CalendarDate;
}

function parts(date: CalendarDate): [year: number, month: number, day: number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

/**
 * Reads a date in the layout the caller names, never guessing it. `03/04/2026` as `DD/MM/YYYY`
 * is 3 April. Surrounding spaces are ignored. A day that does not exist, such as 31/02, is an error.
 */
export function parseCalendarDate(
  text: string,
  format: DateFormat,
): Result<CalendarDate, DateParseError> {
  const groups = PATTERNS[format].exec(text.trim())?.groups;
  if (groups?.year === undefined || groups.month === undefined || groups.day === undefined) {
    return err({ code: 'not-a-date', text });
  }
  const year = Number(groups.year);
  const month = Number(groups.month);
  const day = Number(groups.day);
  if (!isRealDay(year, month, day)) {
    return err({ code: 'impossible-date', text });
  }
  return ok(toCalendarDate(year, month, day));
}

/** Negative if `a` is earlier, zero if the same day, positive if later. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Days since 1970-01-01 and back, using the proleptic Gregorian calendar.
// Algorithm from Howard Hinnant, "chrono-Compatible Low-Level Date Algorithms".
function toDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const monthFromMarch = (month + 9) % 12;
  const dayOfYear = Math.floor((153 * monthFromMarch + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromDayNumber(dayNumber: number): CalendarDate {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthFromMarch = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthFromMarch + 2) / 5) + 1;
  const month = monthFromMarch < 10 ? monthFromMarch + 3 : monthFromMarch - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Date out of range: day ${String(dayNumber)}`);
  }
  return toCalendarDate(year, month, day);
}

/** The date `days` later (or earlier, if negative). Crosses month and year ends correctly. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  if (!Number.isSafeInteger(days)) {
    throw new RangeError(`Not a whole number of days: ${String(days)}`);
  }
  return fromDayNumber(toDayNumber(...parts(date)) + days);
}

/** Days from `from` to `to`: positive when `to` is later. The same day is 0. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return toDayNumber(...parts(to)) - toDayNumber(...parts(from));
}

/** Shows a date the Australian way: `21/11/2026`. */
export function formatDateAU(date: CalendarDate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

const TIMESTAMP_PATTERN =
  /^(?<date>\d{4}-\d{2}-\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.\d{3}Z$/;

/** Reads a UTC ISO timestamp such as `2026-11-21T03:04:05.000Z`, the form `Date#toISOString` gives. */
export function parseTimestamp(text: string): Result<Timestamp, DateParseError> {
  const groups = TIMESTAMP_PATTERN.exec(text)?.groups;
  if (
    groups?.date === undefined ||
    groups.hour === undefined ||
    groups.minute === undefined ||
    groups.second === undefined
  ) {
    return err({ code: 'not-a-date', text });
  }
  const validTime =
    Number(groups.hour) <= 23 && Number(groups.minute) <= 59 && Number(groups.second) <= 59;
  if (!validTime || !parseCalendarDate(groups.date, 'YYYY-MM-DD').ok) {
    return err({ code: 'impossible-date', text });
  }
  return ok(text as Timestamp);
}

/** A clock that never moves, for tests and for replaying a known day. */
export function fixedClock(today: CalendarDate, now: Timestamp): Clock {
  return { today: () => today, now: () => now };
}
