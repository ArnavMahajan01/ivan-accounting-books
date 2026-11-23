// The trial balance: every account's total over a range of days, with debits and credits side by
// side. It is always worked out from journal lines when asked for, and never stored (architecture
// context, "State Model"). Pure: the caller reads the totals and the accounts.

import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { AccountType } from '@shared/kinds';
import { addCents, asCents, negateCents, ZERO_CENTS, type Cents } from '@shared/money';
import type { Account } from './accounts';

/** What one account's lines add up to over a range. Positive is a net debit, negative a net credit. */
export interface AccountTotal {
  readonly accountId: Id<'acc'>;
  readonly total: Cents;
}

export interface TrialBalanceRow {
  readonly accountId: Id<'acc'>;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  /** The account's net debit, or zero. */
  readonly debit: Cents;
  /** The account's net credit, shown as a positive number, or zero. */
  readonly credit: Cents;
}

export interface TrialBalance {
  /** The first and last day counted. Null means no limit on that side. */
  readonly from: CalendarDate | null;
  readonly to: CalendarDate | null;
  /** Accounts with a balance over the range, in code order. An account that nets to zero is left out. */
  readonly rows: readonly TrialBalanceRow[];
  readonly totalDebit: Cents;
  readonly totalCredit: Cents;
  /** Debits equal credits. False means the books are wrong, and it must be said plainly. */
  readonly balanced: boolean;
}

export function buildTrialBalance(
  accounts: readonly Account[],
  totals: readonly AccountTotal[],
  range: { readonly from: CalendarDate | null; readonly to: CalendarDate | null },
): TrialBalance {
  const totalOf = new Map(totals.map((t) => [t.accountId, t.total]));
  const known = new Set(accounts.map((a) => a.id));
  for (const t of totals) {
    // A foreign key makes this impossible, so reaching it is a bug and must not be hidden.
    if (!known.has(t.accountId))
      throw new RangeError(`Total for an unknown account: ${t.accountId}`);
  }
  const rows: TrialBalanceRow[] = accounts
    .toSorted((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
    .flatMap((account) => {
      const total = totalOf.get(account.id) ?? ZERO_CENTS;
      if (total === 0) return [];
      return [
        {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: total > 0 ? total : ZERO_CENTS,
          credit: total < 0 ? negateCents(total) : ZERO_CENTS,
        },
      ];
    });
  const totalDebit = rows.reduce((sum, row) => addCents(sum, row.debit), asCents(0));
  const totalCredit = rows.reduce((sum, row) => addCents(sum, row.credit), asCents(0));
  return { ...range, rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}
