// Finds the other side of a transfer between his own accounts (spec 073): a line in another of his
// bank accounts, for the same amount the other way, within five days. The bank can take a day or
// two to show the second side, and a weekend can add two more.

import type { CalendarDate } from '@shared/dates';
import { negateCents, type Cents } from '@shared/money';
import { closestByDate } from './closest-date';

export const TRANSFER_WINDOW_DAYS = 5;

export interface TransferSide {
  readonly id: string;
  readonly bankAccountId: string;
  readonly date: CalendarDate;
  /** Money in is positive, money out negative. */
  readonly amount: Cents;
}

/** The line that is this one's other side, or null when none is close enough. */
export function findTransferMatch<T extends TransferSide>(
  line: TransferSide,
  candidates: readonly T[],
): T | null {
  const fitting = candidates.filter(
    (c) =>
      c.id !== line.id &&
      c.bankAccountId !== line.bankAccountId &&
      c.amount === negateCents(line.amount),
  );
  return closestByDate(line.date, fitting, TRANSFER_WINDOW_DAYS);
}
