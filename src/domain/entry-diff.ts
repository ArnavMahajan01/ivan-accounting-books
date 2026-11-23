// What changed when a posted entry was corrected, in plain words, for the history panel. The audit
// log keeps the whole entry before and after, and this reads the difference between them.

import { formatDateAU } from '@shared/dates';
import { formatCents, sumCents, type Cents } from '@shared/money';
import type { JournalEntry } from './journal';

export interface NameLookup {
  account(id: string): string;
  payee(id: string): string;
}

/** What moved: the debits, which equal the credits. */
function total(entry: JournalEntry): Cents {
  return sumCents(entry.lines.filter((l) => l.amount > 0).map((l) => l.amount));
}

/** One short sentence per thing that changed. An empty list means nothing a person would notice. */
export function describeEntryChange(
  before: JournalEntry,
  after: JournalEntry,
  names: NameLookup,
): string[] {
  const changes: string[] = [];
  if (before.date !== after.date) {
    changes.push(`Date changed from ${formatDateAU(before.date)} to ${formatDateAU(after.date)}`);
  }
  if (before.memo !== after.memo) {
    changes.push(`Description changed from “${before.memo}” to “${after.memo}”`);
  }
  // Lines are compared one by one only when there are as many as before. Otherwise they have been
  // rearranged, and a line-by-line comparison would say things that are not true.
  const sameShape = before.lines.length === after.lines.length;
  for (let i = 0; sameShape && i < before.lines.length; i += 1) {
    const was = before.lines[i];
    const now = after.lines[i];
    if (was === undefined || now === undefined) continue;
    if (was.accountId !== now.accountId) {
      changes.push(
        `Account changed from ${names.account(was.accountId)} to ${names.account(now.accountId)}`,
      );
    }
    if (was.payeeId !== now.payeeId) {
      const from = was.payeeId === null ? 'no one' : names.payee(was.payeeId);
      const to = now.payeeId === null ? 'no one' : names.payee(now.payeeId);
      const sentence = `Payee changed from ${from} to ${to}`;
      if (!changes.includes(sentence)) changes.push(sentence);
    }
  }
  const was = total(before);
  const now = total(after);
  if (was !== now) {
    changes.push(`Total changed from ${formatCents(was)} to ${formatCents(now)}`);
  } else if (before.lines.length !== after.lines.length) {
    changes.push('The lines of the entry changed');
  }
  return changes;
}
