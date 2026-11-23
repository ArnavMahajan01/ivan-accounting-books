// How a journal entry reads as one row of the Transactions list: who it was with, which account it
// was for, how much, and whether money came in, went out or moved between his own accounts. The
// books store lines, and he thinks in transactions, so this turns one into the other.

import { addCents, asCents, ZERO_CENTS, type Cents } from '@shared/money';
import type { EntryDirection } from '@shared/views';

export type { EntryDirection };

export interface SummaryLine {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  /** The account is one of his bank accounts. */
  readonly isBank: boolean;
  /** Positive is a debit, negative a credit. */
  readonly amount: Cents;
  readonly gst: Cents;
  /** The line carries a GST code, as the line for the thing bought or sold does. */
  readonly hasTaxCode: boolean;
  /** The contact's name, or null. */
  readonly payee: string | null;
}

export interface EntrySummary {
  readonly direction: EntryDirection;
  /** The first payee on the entry, or null. */
  readonly payee: string | null;
  /** The account the entry was for, or null if it has no lines. */
  readonly account: { readonly id: string; readonly code: string; readonly name: string } | null;
  readonly beforeGst: Cents;
  readonly gst: Cents;
  /** What moved, GST included: the debits, which equal the credits. */
  readonly total: Cents;
}

function largest(lines: readonly SummaryLine[]): SummaryLine | undefined {
  return lines.reduce<SummaryLine | undefined>(
    (best, line) =>
      best === undefined || Math.abs(line.amount) > Math.abs(best.amount) ? line : best,
    undefined,
  );
}

/**
 * The account an entry was for. It is the line with a GST code (the thing bought or sold). With
 * none, it is the largest line that is not a bank account (drawings, a payment to the ATO). With
 * only bank lines, it is a transfer, and shows the account the money went to.
 */
function primaryAccount(lines: readonly SummaryLine[]): SummaryLine | undefined {
  const coded = lines.filter((l) => l.hasTaxCode);
  if (coded.length > 0) return largest(coded);
  const others = lines.filter((l) => !l.isBank);
  if (others.length > 0) return largest(others);
  return largest(lines.filter((l) => l.amount > 0));
}

export function summariseEntry(lines: readonly SummaryLine[]): EntrySummary {
  const total = lines.reduce(
    (sum, l) => (l.amount > 0 ? addCents(sum, l.amount) : sum),
    ZERO_CENTS,
  );
  const gst = lines.reduce((sum, l) => addCents(sum, asCents(Math.abs(l.gst))), ZERO_CENTS);
  const bank = lines.filter((l) => l.isBank);
  const bankNet = bank.reduce((sum, l) => addCents(sum, l.amount), ZERO_CENTS);
  const direction: EntryDirection =
    bank.length === 0 ? 'journal' : bankNet > 0 ? 'in' : bankNet < 0 ? 'out' : 'transfer';
  const account = primaryAccount(lines);
  return {
    direction,
    payee: lines.find((l) => l.payee !== null)?.payee ?? null,
    account:
      account === undefined
        ? null
        : { id: account.accountId, code: account.accountCode, name: account.accountName },
    beforeGst: asCents(total - gst),
    gst,
    total,
  };
}
