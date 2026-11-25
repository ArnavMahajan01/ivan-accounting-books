// Works out which lines of a statement file are already in the books, so importing the same file
// twice, or one that overlaps an earlier file, adds nothing twice (risk L3, invariant 2). Pure.
//
// A line's key is the bank's own transaction id when the file has one. When it has none, the key
// is worked out from the line itself: the day, the amount, the description and the running
// balance. Two real transactions can be identical (two coffees on one day), so the key also counts
// how many identical lines came before it in the file. That count, not the line's place in the
// file, is what makes the same transaction get the same key in an overlapping file, where it sits
// at a different place.

import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';

/** What a key is worked out from. A parsed statement line has all of it. */
export interface LineFacts {
  readonly date: CalendarDate;
  readonly description: string;
  readonly amount: Cents;
  readonly bankId: string | null;
  readonly balance: Cents | null;
}

export type DuplicateStatus = 'new' | 'duplicate';

export interface CheckedLine<T extends LineFacts> {
  readonly line: T;
  readonly key: string;
  readonly status: DuplicateStatus;
}

// Capitals and spacing vary between downloads of the same statement, so they do not count.
function tidy(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toUpperCase();
}

function baseKey(line: LineFacts): string {
  if (line.bankId !== null) return `id:${line.bankId}`;
  return `calc:${line.date}|${String(line.amount)}|${tidy(line.description)}|${line.balance === null ? '' : String(line.balance)}`;
}

/** The key of every line, in order. The first of its kind has no suffix, the second `#2`, and so on. */
export function lineKeys(lines: readonly LineFacts[]): string[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = baseKey(line);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}#${String(count)}`;
  });
}

/** Marks each line new, or duplicate when its key is among the keys the books already hold. */
export function markDuplicates<T extends LineFacts>(
  lines: readonly T[],
  existingKeys: ReadonlySet<string>,
): CheckedLine<T>[] {
  const keys = lineKeys(lines);
  return lines.map((line, index) => {
    const key = keys[index] ?? '';
    return { line, key, status: existingKeys.has(key) ? 'duplicate' : 'new' };
  });
}
