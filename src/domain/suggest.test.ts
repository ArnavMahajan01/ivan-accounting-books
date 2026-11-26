import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { suggestFor, type PastPosting } from './suggest';

const past = (
  words: string,
  accountId: string,
  date: string,
  over: Partial<PastPosting> = {},
): PastPosting => ({
  words,
  direction: 'out',
  accountId,
  taxCodeId: 'tax_gst',
  payeeId: null,
  date: date as CalendarDate,
  ...over,
});

// Invented history for Harbour Lane Joinery's bank lines.
const history: PastPosting[] = [
  past('BUNNINGS', 'acc_materials', '2026-10-02', { payeeId: 'con_bunnings' }),
  past('BUNNINGS', 'acc_tools', '2026-10-20', { payeeId: 'con_bunnings' }),
  past('AMPOL ALEXANDRIA', 'acc_motor', '2026-10-05'),
  past('AMPOL MASCOT', 'acc_motor', '2026-10-12'),
  past('AMPOL ROSEBERY', 'acc_travel', '2026-10-30'),
  past('DEPOSIT ELLIS BATHROOMS INV', 'acc_sales', '2026-10-09', { direction: 'in' }),
];

describe('suggestFor', () => {
  it('follows the most recent line with the same words: same as last time', () => {
    expect(suggestFor({ words: 'BUNNINGS', direction: 'out' }, history)).toEqual({
      accountId: 'acc_tools',
      taxCodeId: 'tax_gst',
      payeeId: 'con_bunnings',
      reason: 'same-as-last-time',
    });
  });

  it('guesses from lines with the same first word, by the account used most', () => {
    expect(suggestFor({ words: 'AMPOL WATERLOO', direction: 'out' }, history)).toMatchObject({
      accountId: 'acc_motor',
      reason: 'best-guess',
    });
  });

  it('keeps money in and money out apart', () => {
    expect(
      suggestFor({ words: 'DEPOSIT ELLIS BATHROOMS INV', direction: 'out' }, history),
    ).toBeNull();
    expect(
      suggestFor({ words: 'DEPOSIT ELLIS BATHROOMS INV', direction: 'in' }, history),
    ).toMatchObject({ accountId: 'acc_sales', reason: 'same-as-last-time' });
  });

  it('gives no suggestion for a line with no history', () => {
    expect(suggestFor({ words: 'COVERWISE INSURANCE', direction: 'out' }, history)).toBeNull();
    expect(suggestFor({ words: 'BUNNINGS', direction: 'out' }, [])).toBeNull();
    expect(suggestFor({ words: '', direction: 'out' }, history)).toBeNull();
  });

  it('does not guess from a short first word', () => {
    const atm = [past('ATM WITHDRAWAL SYDNEY', 'acc_drawings', '2026-10-01')];
    expect(suggestFor({ words: 'ATM PARRAMATTA', direction: 'out' }, atm)).toBeNull();
  });
});
