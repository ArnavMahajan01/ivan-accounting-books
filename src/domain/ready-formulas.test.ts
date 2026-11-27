import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { gstInsideFormula } from './gst';
import { basDueDate, basPeriodOf } from './periods';
import { readyFormulas, readyFormulasTab } from './ready-formulas';

const day = (t: string) => t as CalendarDate;

describe('the usual BAS due dates (ATO)', () => {
  it('a quarter is due on the 28th of the month after, and Oct–Dec on 28 February', () => {
    const due = (d: string) => basDueDate(basPeriodOf(day(d), 'quarterly'));
    expect([due('2026-08-01'), due('2026-11-27'), due('2027-02-01'), due('2027-05-01')]).toEqual([
      '2026-10-28',
      '2027-02-28',
      '2027-04-28',
      '2027-07-28',
    ]);
  });

  it('a month is due on the 21st of the next month, December into January', () => {
    expect(basDueDate(basPeriodOf(day('2026-11-03'), 'monthly'))).toBe('2026-12-21');
    expect(basDueDate(basPeriodOf(day('2026-12-03'), 'monthly'))).toBe('2027-01-21');
  });
});

describe('ready formulas (spec 113)', () => {
  it('works GST out as one eleventh, never 10%', () => {
    const gst = readyFormulas(day('2026-11-27')).find((f) => f.name === 'GST in an amount');
    expect(gst?.formula).toBe(`=${gstInsideFormula('B2')}`);
    expect(
      readyFormulas(day('2026-11-27')).some((f) => /\*\s*0?\.1\b|\/10\b|10%/.test(f.formula)),
    ).toBe(false);
  });

  it('counts down to this quarter’s usual due date', () => {
    const days = readyFormulas(day('2026-11-27')).at(-1);
    expect(days?.formula).toBe('=DATE(2027,2,28)-TODAY()');
    expect(days?.what).toContain('28/02/2027');
  });

  it('writes explanations and the formulas to copy as text, and only the examples as formulas', () => {
    const tab = readyFormulasTab(day('2026-11-27'));
    const rows = tab.rows.slice(3);
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.slice(0, 3).every((c) => c.kind === 'text')).toBe(true);
      expect(row[5]?.kind).toBe('formula');
    }
    // The GST example points at its own row: the fourth row of the tab.
    expect(rows[0]?.[5]).toEqual({ kind: 'formula', formula: `=${gstInsideFormula('D4')}` });
    expect(rows[2]?.[5]).toEqual({ kind: 'formula', formula: '=D6/E6' });
  });
});
