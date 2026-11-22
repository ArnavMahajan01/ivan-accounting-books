import { describe, expect, it } from 'vitest';
import {
  addDays,
  compareDates,
  daysBetween,
  fixedClock,
  formatDateAU,
  parseCalendarDate,
  parseTimestamp,
  type CalendarDate,
  type DateFormat,
  type DateParseErrorCode,
  type Timestamp,
} from './dates';

function date(text: string, format: DateFormat = 'YYYY-MM-DD'): CalendarDate {
  const r = parseCalendarDate(text, format);
  if (!r.ok) throw new Error(`Expected "${text}" to parse, got ${r.error.code}`);
  return r.value;
}

function failure(text: string, format: DateFormat): DateParseErrorCode {
  const r = parseCalendarDate(text, format);
  if (r.ok) throw new Error(`Expected "${text}" to fail, got ${r.value}`);
  return r.error.code;
}

function timestamp(text: string): Timestamp {
  const r = parseTimestamp(text);
  if (!r.ok) throw new Error(`Expected "${text}" to parse, got ${r.error.code}`);
  return r.value;
}

describe('parseCalendarDate', () => {
  it('reads Australian dates day first: 03/04/2026 is 3 April', () => {
    expect(date('03/04/2026', 'DD/MM/YYYY')).toBe('2026-04-03');
    expect(date('3/4/2026', 'D/M/YYYY')).toBe('2026-04-03');
  });

  it.each<[string, DateFormat, string]>([
    ['21/11/2026', 'DD/MM/YYYY', '2026-11-21'],
    ['21/11/2026', 'D/M/YYYY', '2026-11-21'],
    ['03/04/2026', 'D/M/YYYY', '2026-04-03'],
    ['2026-11-21', 'YYYY-MM-DD', '2026-11-21'],
    ['20261121', 'YYYYMMDD', '2026-11-21'],
    ['  21/11/2026 ', 'DD/MM/YYYY', '2026-11-21'],
  ])('reads %j as %s into %s', (text, format, expected) => {
    expect(date(text, format)).toBe(expected);
  });

  it('accepts 29 February only in a leap year', () => {
    expect(date('29/02/2028', 'DD/MM/YYYY')).toBe('2028-02-29');
    expect(date('29/02/2000', 'DD/MM/YYYY')).toBe('2000-02-29');
    expect(failure('29/02/2027', 'DD/MM/YYYY')).toBe('impossible-date');
    expect(failure('29/02/2100', 'DD/MM/YYYY')).toBe('impossible-date');
  });

  it.each<[string, DateFormat]>([
    ['31/02/2026', 'DD/MM/YYYY'],
    ['31/04/2026', 'DD/MM/YYYY'],
    ['00/01/2026', 'DD/MM/YYYY'],
    ['01/13/2026', 'DD/MM/YYYY'],
    ['01/00/2026', 'DD/MM/YYYY'],
    ['32/1/2026', 'D/M/YYYY'],
    ['2026-02-30', 'YYYY-MM-DD'],
    ['20261131', 'YYYYMMDD'],
    ['01/01/0000', 'DD/MM/YYYY'],
  ])('rejects %j (%s) as a day that does not exist', (text, format) => {
    expect(failure(text, format)).toBe('impossible-date');
  });

  it.each<[string, DateFormat]>([
    ['', 'DD/MM/YYYY'],
    ['abc', 'DD/MM/YYYY'],
    ['3/4/2026', 'DD/MM/YYYY'],
    ['03/04/26', 'DD/MM/YYYY'],
    ['03-04-2026', 'DD/MM/YYYY'],
    ['2026-11-21', 'DD/MM/YYYY'],
    ['21/11/2026', 'YYYY-MM-DD'],
    ['2026-1-5', 'YYYY-MM-DD'],
    ['003/4/2026', 'D/M/YYYY'],
    ['20261121120000', 'YYYYMMDD'],
    ['2026112', 'YYYYMMDD'],
  ])('rejects %j as not a %s date', (text, format) => {
    expect(failure(text, format)).toBe('not-a-date');
  });
});

describe('compareDates', () => {
  it('orders dates', () => {
    expect(compareDates(date('2026-04-03'), date('2026-11-21'))).toBeLessThan(0);
    expect(compareDates(date('2026-11-21'), date('2026-04-03'))).toBeGreaterThan(0);
    expect(compareDates(date('2026-11-21'), date('2026-11-21'))).toBe(0);
    expect(compareDates(date('2025-12-31'), date('2026-01-01'))).toBeLessThan(0);
  });
});

describe('addDays', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['2026-04-30', 1, '2026-05-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-06-30', 1, '2026-07-01'],
    ['2026-11-21', 0, '2026-11-21'],
    ['2026-07-01', 364, '2027-06-30'],
  ])('%s plus %i days is %s, across month ends', (start, days, expected) => {
    expect(addDays(date(start), days)).toBe(expected);
  });

  it('agrees with the calendar for every day from 1999 to 2031', () => {
    // Date.UTC is used only here, as an independent check of the integer arithmetic.
    const start = date('1999-01-01');
    const startMs = Date.UTC(1999, 0, 1);
    for (let i = 0; i < 33 * 366; i += 1) {
      const expected = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10);
      expect(addDays(start, i)).toBe(expected);
    }
  });

  it('throws for a fraction of a day or a date out of range', () => {
    expect(() => addDays(date('2026-11-21'), 0.5)).toThrow(RangeError);
    expect(() => addDays(date('9999-12-31'), 1)).toThrow(RangeError);
    expect(() => addDays(date('0001-01-01'), -1)).toThrow(RangeError);
  });
});

describe('daysBetween', () => {
  it('counts days, signed', () => {
    expect(daysBetween(date('2026-11-21'), date('2026-11-21'))).toBe(0);
    expect(daysBetween(date('2026-02-28'), date('2026-03-01'))).toBe(1);
    expect(daysBetween(date('2028-02-28'), date('2028-03-01'))).toBe(2);
    expect(daysBetween(date('2026-07-01'), date('2027-06-30'))).toBe(364);
    expect(daysBetween(date('2027-07-01'), date('2028-06-30'))).toBe(365);
    expect(daysBetween(date('2026-11-21'), date('2026-11-01'))).toBe(-20);
  });

  it('undoes addDays', () => {
    const start = date('2026-11-21');
    for (const n of [-1000, -31, -1, 0, 1, 31, 1000]) {
      expect(daysBetween(start, addDays(start, n))).toBe(n);
    }
  });
});

describe('formatDateAU', () => {
  it('shows day, month, year', () => {
    expect(formatDateAU(date('2026-11-21'))).toBe('21/11/2026');
    expect(formatDateAU(date('2026-04-03'))).toBe('03/04/2026');
  });

  it('round-trips with parseCalendarDate', () => {
    const d = date('2028-02-29');
    expect(date(formatDateAU(d), 'DD/MM/YYYY')).toBe(d);
  });
});

describe('parseTimestamp', () => {
  it('reads a UTC ISO timestamp', () => {
    expect(timestamp('2026-11-21T03:04:05.000Z')).toBe('2026-11-21T03:04:05.000Z');
  });

  it.each([
    ['2026-11-21T03:04:05Z', 'not-a-date'],
    ['2026-11-21T03:04:05.000+11:00', 'not-a-date'],
    ['2026-11-21', 'not-a-date'],
    ['', 'not-a-date'],
    ['2026-02-30T00:00:00.000Z', 'impossible-date'],
    ['2026-11-21T24:00:00.000Z', 'impossible-date'],
    ['2026-11-21T23:60:00.000Z', 'impossible-date'],
  ])('rejects %j as %s', (text, code) => {
    const r = parseTimestamp(text);
    expect(r.ok ? 'parsed' : r.error.code).toBe(code);
  });
});

describe('fixedClock', () => {
  it('always gives the same day and moment', () => {
    const clock = fixedClock(date('2026-11-22'), timestamp('2026-11-21T14:30:00.000Z'));
    expect(clock.today()).toBe('2026-11-22');
    expect(clock.now()).toBe('2026-11-21T14:30:00.000Z');
    expect(clock.today()).toBe('2026-11-22');
  });
});
