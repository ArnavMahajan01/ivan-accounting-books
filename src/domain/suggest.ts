// Suggests an account, GST code and payee for a waiting bank line from how he posted similar lines
// before (spec 074). A suggestion is only ever shown: nothing is posted without him.
//
//   same as last time: a line with exactly the same words went the same way before. The most
//                      recent one is followed.
//   best guess:        lines starting with the same first word went the same way before. The
//                      account used most often among them is followed, the most recent on a tie.
//
// Money in is only compared with money in, and money out with money out, so a refund from a
// supplier is not filed as a purchase.

import { compareDates, type CalendarDate } from '@shared/dates';
import type { SuggestionReason } from '@shared/views';

export interface PastPosting {
  /** `descriptionWords` of the line that was posted. */
  readonly words: string;
  readonly direction: 'in' | 'out';
  readonly accountId: string;
  readonly taxCodeId: string | null;
  readonly payeeId: string | null;
  readonly date: CalendarDate;
}

export interface Suggestion {
  readonly accountId: string;
  readonly taxCodeId: string | null;
  readonly payeeId: string | null;
  readonly reason: SuggestionReason;
}

/** A first word this short says too little (`ATM`, `TO`) to guess from. */
const MIN_GUESS_WORD = 4;

function latest(postings: readonly PastPosting[]): PastPosting | undefined {
  return [...postings].sort((a, b) => compareDates(b.date, a.date))[0];
}

function toSuggestion(posting: PastPosting, reason: SuggestionReason): Suggestion {
  return {
    accountId: posting.accountId,
    taxCodeId: posting.taxCodeId,
    payeeId: posting.payeeId,
    reason,
  };
}

export function suggestFor(
  line: { readonly words: string; readonly direction: 'in' | 'out' },
  history: readonly PastPosting[],
): Suggestion | null {
  if (line.words === '') return null;
  const sameWay = history.filter((p) => p.direction === line.direction);

  const same = latest(sameWay.filter((p) => p.words === line.words));
  if (same !== undefined) return toSuggestion(same, 'same-as-last-time');

  const first = line.words.split(' ')[0] ?? '';
  if (first.length < MIN_GUESS_WORD) return null;
  const alike = sameWay.filter((p) => p.words.split(' ')[0] === first);
  if (alike.length === 0) return null;

  const counts = new Map<string, number>();
  for (const p of alike) counts.set(p.accountId, (counts.get(p.accountId) ?? 0) + 1);
  const most = Math.max(...counts.values());
  const winner = latest(alike.filter((p) => counts.get(p.accountId) === most));
  return winner === undefined ? null : toSuggestion(winner, 'best-guess');
}
