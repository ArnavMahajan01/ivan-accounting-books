import { describe, expect, it } from 'vitest';
import { addDays, parseCalendarDate, type CalendarDate } from '@shared/dates';
import { BAS_FREQUENCIES } from '@shared/kinds';
import { basPeriodOf, basPeriodsOfYear, financialYearOf } from './periods';

function d(text: string): CalendarDate {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(`bad test date ${text}`);
  return parsed.value;
}

describe('financialYearOf', () => {
  it('runs 1 July to 30 June', () => {
    expect(financialYearOf(d('2027-06-30'))).toEqual({
      startYear: 2026,
      start: '2026-07-01',
      end: '2027-06-30',
      label: 'FY 2026–27',
    });
    expect(financialYearOf(d('2027-07-01'))).toMatchObject({
      startYear: 2027,
      start: '2027-07-01',
      end: '2028-06-30',
      label: 'FY 2027–28',
    });
  });

  it('puts 31 December and 1 January in the same year', () => {
    expect(financialYearOf(d('2026-12-31')).label).toBe('FY 2026–27');
    expect(financialYearOf(d('2027-01-01')).label).toBe('FY 2026–27');
  });

  it('handles 29 February in a leap year', () => {
    expect(financialYearOf(d('2028-02-29'))).toMatchObject({
      label: 'FY 2027–28',
      end: '2028-06-30',
    });
  });

  it('labels the turn of a century with two digits', () => {
    expect(financialYearOf(d('2099-08-01')).label).toBe('FY 2099–00');
  });
});

describe('basPeriodOf', () => {
  it('gives the calendar month for monthly', () => {
    expect(basPeriodOf(d('2026-07-01'), 'monthly')).toEqual({
      frequency: 'monthly',
      start: '2026-07-01',
      end: '2026-07-31',
      label: 'July 2026',
    });
    expect(basPeriodOf(d('2027-06-30'), 'monthly')).toMatchObject({
      start: '2027-06-01',
      end: '2027-06-30',
    });
  });

  it('ends February on the 29th in a leap year and the 28th otherwise', () => {
    expect(basPeriodOf(d('2028-02-29'), 'monthly')).toMatchObject({
      start: '2028-02-01',
      end: '2028-02-29',
      label: 'February 2028',
    });
    expect(basPeriodOf(d('2027-02-10'), 'monthly').end).toBe('2027-02-28');
  });

  it('gives the quarters Jul to Sep, Oct to Dec, Jan to Mar and Apr to Jun', () => {
    const quarter = (date: string) => {
      const p = basPeriodOf(d(date), 'quarterly');
      return [p.start, p.end, p.label];
    };
    expect(quarter('2026-07-01')).toEqual(['2026-07-01', '2026-09-30', 'Jul–Sep 2026']);
    expect(quarter('2026-09-30')).toEqual(['2026-07-01', '2026-09-30', 'Jul–Sep 2026']);
    expect(quarter('2026-10-01')).toEqual(['2026-10-01', '2026-12-31', 'Oct–Dec 2026']);
    expect(quarter('2026-12-31')).toEqual(['2026-10-01', '2026-12-31', 'Oct–Dec 2026']);
    expect(quarter('2027-01-01')).toEqual(['2027-01-01', '2027-03-31', 'Jan–Mar 2027']);
    expect(quarter('2028-02-29')).toEqual(['2028-01-01', '2028-03-31', 'Jan–Mar 2028']);
    expect(quarter('2027-06-30')).toEqual(['2027-04-01', '2027-06-30', 'Apr–Jun 2027']);
  });
});

describe('basPeriodsOfYear', () => {
  it.each(BAS_FREQUENCIES)(
    '%s periods cover the whole year with no gap or overlap',
    (frequency) => {
      const year = financialYearOf(d('2027-11-15'));
      const periods = basPeriodsOfYear(year, frequency);
      expect(periods).toHaveLength(frequency === 'monthly' ? 12 : 4);
      expect(periods[0]?.start).toBe(year.start);
      expect(periods.at(-1)?.end).toBe(year.end);
      periods.slice(1).forEach((period, index) => {
        expect(period.start).toBe(addDays(periods[index]?.end ?? year.start, 1));
      });
    },
  );

  it('lists the quarters of FY 2026–27 by label', () => {
    expect(
      basPeriodsOfYear(financialYearOf(d('2026-07-01')), 'quarterly').map((p) => p.label),
    ).toEqual(['Jul–Sep 2026', 'Oct–Dec 2026', 'Jan–Mar 2027', 'Apr–Jun 2027']);
  });

  it('agrees with basPeriodOf for every day of a leap financial year', () => {
    const year = financialYearOf(d('2027-07-01'));
    for (const frequency of BAS_FREQUENCIES) {
      const periods = basPeriodsOfYear(year, frequency);
      for (let day = year.start, n = 0; n < 366; day = addDays(day, 1), n += 1) {
        expect(periods).toContainEqual(basPeriodOf(day, frequency));
      }
    }
  });
});
