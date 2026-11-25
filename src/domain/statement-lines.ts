import type { CalendarDate, Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { ImportFormat, StatementLineStatus } from '@shared/kinds';
import type { Cents } from '@shared/money';

/** One line from a bank statement file, as it is kept after import. */
export interface StatementLine {
  readonly id: Id<'stl'>;
  readonly bankAccountId: Id<'bnk'>;
  readonly batchId: Id<'imp'>;
  readonly date: CalendarDate;
  readonly description: string;
  /** Money in is positive and money out is negative. Never zero. */
  readonly amount: Cents;
  /** The running balance after this line, when the file gives one. */
  readonly balance: Cents | null;
  /** The bank's transaction id, or a key worked out from the line. Unique per bank account. */
  readonly key: string;
  readonly status: StatementLineStatus;
  readonly createdAt: Timestamp;
}

/** One imported file: what it was, what it covered and how many lines it added. */
export interface ImportBatch {
  readonly id: Id<'imp'>;
  readonly bankAccountId: Id<'bnk'>;
  readonly fileName: string;
  readonly format: ImportFormat;
  /** SHA-256 of the file's text, in lower case hex. */
  readonly fileHash: string;
  readonly periodFrom: CalendarDate;
  readonly periodTo: CalendarDate;
  readonly newCount: number;
  readonly duplicateCount: number;
  readonly rejectedCount: number;
  /** What the account held before the file's first day, worked out from its closing balance and every line it lists. */
  readonly openingBalance: Cents | null;
  /** What the statement says the account held at the end of the file, when it says. */
  readonly closingBalance: { readonly amount: Cents; readonly date: CalendarDate } | null;
  readonly importedAt: Timestamp;
}
