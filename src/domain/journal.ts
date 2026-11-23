// What a journal entry is, and the check every entry must pass before it is saved (invariants 1 and 6).
//
// Signs: an amount is positive for a debit and negative for a credit, in integer cents, and the
// lines of an entry sum to zero.
//
// The GST convention (skill au-bookkeeping-rules, "Double entry"): a taxable line's amount is
// NET of GST, and the GST on it is recorded in the line's own `gst` field, with the same sign.
// A separate line to the GST account then carries the total of those GST amounts, so the entry
// still sums to zero. A $1,100 sale paid into the bank is three lines:
//   bank +110000,  sales -100000 (gst -10000),  GST account -10000.
// A $550 purchase paid from the bank:
//   materials +50000 (gst +5000),  GST account +5000,  bank -55000.

import { compareDates, type CalendarDate, type Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { EntrySourceKind } from '@shared/kinds';
import { sumCents, type Cents } from '@shared/money';

/** One line of a posted entry. */
export interface JournalLine extends EntryLineInput {
  readonly id: Id<'lin'>;
}

/** A posted entry, with its lines in the order they were posted. */
export interface JournalEntry {
  readonly id: Id<'ent'>;
  readonly date: CalendarDate;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
  readonly sourceId: string | null;
  readonly lines: readonly JournalLine[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface EntryLineInput {
  readonly accountId: Id<'acc'>;
  /** Net of GST. Positive is a debit and negative is a credit. Never zero. */
  readonly amount: Cents;
  readonly taxCodeId: Id<'tax'> | null;
  /** The GST on this line, with the same sign as `amount`. Zero when there is none. */
  readonly gst: Cents;
  /** A contact, once contacts exist (folder 10). */
  readonly payeeId: string | null;
  readonly memo: string;
}

/** An entry as it is offered for posting. It has no id yet: the posting service makes one. */
export interface EntryInput {
  readonly date: CalendarDate;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
  readonly sourceId: string | null;
  readonly lines: readonly EntryLineInput[];
}

/** What the check needs to know from the books. The caller reads it, so the check stays pure. */
export interface EntryContext {
  /** Every account that exists, by id. */
  readonly accounts: ReadonlyMap<string, { readonly active: boolean }>;
  /** The ids of the contacts that exist. A line's payee must be one of them. */
  readonly contacts: ReadonlySet<string>;
  /** Nothing may be posted, changed or removed on or before this day. Null if nothing is locked. */
  readonly lockDate: CalendarDate | null;
}

export type EntryProblem =
  | { readonly code: 'too-few-lines' }
  | { readonly code: 'lines-do-not-balance'; readonly difference: Cents }
  | { readonly code: 'zero-line'; readonly line: number }
  | { readonly code: 'gst-sign'; readonly line: number }
  | { readonly code: 'unknown-account'; readonly line: number; readonly accountId: string }
  | { readonly code: 'inactive-account'; readonly line: number; readonly accountId: string }
  | { readonly code: 'unknown-payee'; readonly line: number; readonly payeeId: string }
  | { readonly code: 'locked-period'; readonly lockDate: CalendarDate };

/** Whether a day is on or before the lock date, so nothing may change on it. */
export function isLocked(date: CalendarDate, lockDate: CalendarDate | null): boolean {
  return lockDate !== null && compareDates(date, lockDate) <= 0;
}

/**
 * Every reason this entry may not be saved. An empty list means it may. Lines are numbered from 0,
 * in the order given.
 */
export function validateEntry(entry: EntryInput, context: EntryContext): EntryProblem[] {
  const problems: EntryProblem[] = [];

  if (isLocked(entry.date, context.lockDate) && context.lockDate !== null) {
    problems.push({ code: 'locked-period', lockDate: context.lockDate });
  }
  if (entry.lines.length < 2) problems.push({ code: 'too-few-lines' });

  entry.lines.forEach((line, index) => {
    if (line.amount === 0) problems.push({ code: 'zero-line', line: index });
    if (line.gst !== 0 && line.gst > 0 !== line.amount > 0) {
      problems.push({ code: 'gst-sign', line: index });
    }
    const account = context.accounts.get(line.accountId);
    if (account === undefined) {
      problems.push({ code: 'unknown-account', line: index, accountId: line.accountId });
    } else if (!account.active) {
      problems.push({ code: 'inactive-account', line: index, accountId: line.accountId });
    }
    if (line.payeeId !== null && !context.contacts.has(line.payeeId)) {
      problems.push({ code: 'unknown-payee', line: index, payeeId: line.payeeId });
    }
  });

  const difference = sumCents(entry.lines.map((line) => line.amount));
  if (difference !== 0) problems.push({ code: 'lines-do-not-balance', difference });
  return problems;
}
