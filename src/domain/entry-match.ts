// Finds an entry already in the books that a bank line is the statement's record of (spec 069a):
// an entry that moves the same amount through the same bank account, within five days, and that no
// other bank line is matched with yet. Matching links the two and posts nothing, so the movement is
// never counted twice.

import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import { closestByDate } from './closest-date';

export const MATCH_WINDOW_DAYS = 5;

export interface MatchableEntry {
  readonly id: string;
  readonly date: CalendarDate;
  /** What the entry did to the bank account: positive in, negative out. */
  readonly bankAmount: Cents;
}

export function findEntryMatch<T extends MatchableEntry>(
  line: { readonly date: CalendarDate; readonly amount: Cents },
  entries: readonly T[],
): T | null {
  return closestByDate(
    line.date,
    entries.filter((e) => e.bankAmount === line.amount),
    MATCH_WINDOW_DAYS,
  );
}
