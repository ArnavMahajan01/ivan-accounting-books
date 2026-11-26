// Which waiting bank lines are the bank's record of an entry already in the books (spec 069a).
// Shared by the To review list and by rules posting on import (spec 081), so a line with a match
// is never posted a second time by a rule.

import {
  listMatchableEntries,
  type MatchableEntryRow,
  type ReviewLine,
} from '@data/review-repository';
import { MATCH_WINDOW_DAYS, findEntryMatch } from '@domain/entry-match';
import { addDays, compareDates } from '@shared/dates';
import type { ReadContext } from './context';

/** Each line's match, by line id. Lines are taken in the order given, and an entry goes to one line. */
export function entryMatchesFor(
  ctx: ReadContext,
  lines: readonly ReviewLine[],
): Map<string, MatchableEntryRow> {
  const dates = lines.map((l) => l.date).sort(compareDates);
  const first = dates[0];
  const last = dates.at(-1);
  const found = new Map<string, MatchableEntryRow>();
  if (first === undefined || last === undefined) return found;
  const matchable = listMatchableEntries(
    ctx.db,
    addDays(first, -MATCH_WINDOW_DAYS),
    addDays(last, MATCH_WINDOW_DAYS),
  );
  const claimed = new Set<string>();
  for (const line of lines) {
    const entry = findEntryMatch(
      line,
      matchable.filter((e) => e.ledgerAccountId === line.bankLedgerAccountId && !claimed.has(e.id)),
    );
    // Two lines for the same amount on nearby days must not both offer the same entry.
    if (entry !== null) {
      claimed.add(entry.id);
      found.set(line.id, entry);
    }
  }
  return found;
}
