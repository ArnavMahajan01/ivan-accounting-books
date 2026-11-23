import type { Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';

/** One of his bank accounts, linked to the ledger account that holds its balance. */
export interface BankAccount {
  readonly id: Id<'bnk'>;
  /** How he names it, such as `Business One ··4821`. */
  readonly name: string;
  readonly bank: string;
  /** The last four digits of the account number, and never more. */
  readonly lastFour: string;
  readonly ledgerAccountId: Id<'acc'>;
  /** A sub-account of another bank account. */
  readonly parentId: Id<'bnk'> | null;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
