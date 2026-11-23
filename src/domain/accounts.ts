import type { Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { AccountType } from '@shared/kinds';

/** One account in the chart. Its `id` never changes. Its `code` and `name` can. */
export interface Account {
  readonly id: Id<'acc'>;
  /** What the accountant and the reports call it, such as `1000`. Unique. */
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  /** A sub-account has a parent, such as a bank account under a bank. */
  readonly parentId: Id<'acc'> | null;
  /** The GST code a line to this account starts with (spec 034). */
  readonly defaultTaxCodeId: Id<'tax'> | null;
  /** An inactive account takes no new postings, and keeps its history. */
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
