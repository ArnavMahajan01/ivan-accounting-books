// The closing balance check (spec 061): after a file's new lines are added, do the lines held for
// the account add up to the closing balance the statement states? A difference does not stop an
// import (architecture-context.md, "When Things Fail"), but it is always said, and said plainly:
// a line the file listed and the app could not read is the usual reason, so it is named when it
// is the whole of the difference. Pure.

import { addCents, asCents, negateCents, sumCents, type Cents } from '@shared/money';

export interface BalanceCheckInput {
  /**
   * What the lines already held for the account add up to, as at the statement's last day, starting
   * from the balance before its first file. Null when there is no such figure to start from.
   */
  readonly before: Cents | null;
  /** Whether any file has been imported for the account before. Tells "first file" from "no starting figure". */
  readonly hasEarlierFiles: boolean;
  /** The new lines this import would add. */
  readonly newLines: readonly Cents[];
  /** The closing balance the statement states, or null when it does not state one. */
  readonly closing: Cents | null;
  /** The lines the file listed and could not be read: their amounts, or null when even that is unreadable. */
  readonly rejected: readonly (Cents | null)[];
}

export type BalanceCheck =
  /** The lines held after the import add up to the statement's closing balance. */
  | { readonly kind: 'match'; readonly expected: Cents }
  | {
      readonly kind: 'difference';
      /** What the lines held after the import add up to. */
      readonly expected: Cents;
      /** The statement's closing balance less `expected`. */
      readonly difference: Cents;
      /** Whether the lines that could not be read are exactly the difference. */
      readonly explainedByRejected: boolean;
    }
  /** Nothing has been imported for this account yet, so there is nothing to compare with. */
  | { readonly kind: 'first-file' }
  /**
   * Files were imported before, but none gives a figure this file can start from: the first did
   * not state its balance, or this file is older than the files already imported.
   */
  | { readonly kind: 'no-starting-point' }
  | { readonly kind: 'no-closing-balance' };

export function checkClosingBalance(input: BalanceCheckInput): BalanceCheck {
  if (input.closing === null) return { kind: 'no-closing-balance' };
  if (input.before === null) {
    return { kind: input.hasEarlierFiles ? 'no-starting-point' : 'first-file' };
  }
  const expected = addCents(input.before, sumCents(input.newLines));
  const difference = addCents(input.closing, negateCents(expected));
  if (difference === 0) return { kind: 'match', expected };

  const known = input.rejected.filter((amount): amount is Cents => amount !== null);
  const everyAmountKnown = known.length === input.rejected.length;
  const explainedByRejected =
    everyAmountKnown && known.length > 0 && sumCents(known) === asCents(difference);
  return { kind: 'difference', expected, difference, explainedByRejected };
}
