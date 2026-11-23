// The check on the books, run on every launch (spec 043, risk L1): the file is sound, and the
// books balance. The check looks at what is stored, so it finds trouble however it got there.
// It never changes anything.

import { sumLinesByAccount } from '@data/balance-queries';
import { integrityProblems } from '@data/database';
import {
  countJournalEntries,
  countJournalLines,
  countUnbalancedEntries,
} from '@data/journal-queries';
import type { BooksHealth } from '@shared/bridge-contract';
import type { BooksProblem } from '@shared/kinds';
import type { ReadContext } from './context';

/**
 * Two things must hold: the file's own integrity check passes, and the books balance. They balance
 * when the trial balance over every date has debits equal to credits, which is when the account
 * totals add up to zero, and every entry's own lines sum to zero (two broken entries could cancel
 * out in the trial balance, so each is checked). Data that cannot be read at all is reported as an
 * integrity problem, never thrown, so the check can always say what is wrong.
 */
export function checkBooks(ctx: ReadContext): BooksHealth {
  const problems: BooksProblem[] = [];
  let entries = 0;
  let lines = 0;
  try {
    if (integrityProblems(ctx.db).length > 0) problems.push('integrity-failed');
    const totals = sumLinesByAccount(ctx.db, { from: null, to: null });
    const difference = totals.reduce((sum, t) => sum + t.total, 0);
    if (difference !== 0 || countUnbalancedEntries(ctx.db) > 0) problems.push('out-of-balance');
    entries = countJournalEntries(ctx.db);
    lines = countJournalLines(ctx.db);
  } catch {
    if (!problems.includes('integrity-failed')) problems.push('integrity-failed');
  }
  return { problems, entries, lines };
}

/** The health of books that could not be opened at all. */
export const NOT_OPEN: BooksHealth = { problems: ['not-open'], entries: 0, lines: 0 };
