// What every statement reader returns, whatever the file's format, so the rest of the app never
// sees a format's details (context/decisions/bank-data-source.md). A reader gets the file's text
// and returns this or an error. It never throws and never reads a file.

import type { CalendarDate } from '@shared/dates';
import type { ImportFormat } from '@shared/kinds';
import type { Cents } from '@shared/money';

/** The most text a reader will look at: about five million characters, or 40,000 lines of OFX. */
export const MAX_STATEMENT_CHARS = 5_000_000;

/** One transaction in a file that could be read. */
export interface ParsedLine {
  /** Which transaction in the file this is, counting from 1. */
  readonly position: number;
  /** The line of the file it starts on, counting from 1. */
  readonly line: number;
  readonly date: CalendarDate;
  readonly description: string;
  /** Money in is positive and money out is negative. Never zero. */
  readonly amount: Cents;
  /** The bank's own id for the transaction (`FITID`), when the file has one. */
  readonly bankId: string | null;
  /** The running balance after the transaction, when the file has one. */
  readonly balance: Cents | null;
}

export const REJECTION_REASONS = [
  'missing-date',
  'not-a-date',
  'impossible-date',
  'missing-amount',
  'not-an-amount',
  'too-many-decimals',
  'amount-too-large',
  'zero-amount',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** A transaction that could not be read, and why. The rest of the file is still read. */
export interface RejectedLine {
  readonly position: number;
  readonly line: number;
  readonly reason: RejectionReason;
  /** The text that could not be read, as the file has it. */
  readonly value: string | null;
  /** What the transaction was for, when that much could be read. */
  readonly amount: Cents | null;
  readonly description: string;
}

export interface ParsedStatement {
  readonly format: ImportFormat;
  /** The last four digits of the account number. The rest of the number is never kept. */
  readonly accountLastFour: string;
  /** The days the statement says it covers, or the first and last transaction if it does not say. */
  readonly periodFrom: CalendarDate | null;
  readonly periodTo: CalendarDate | null;
  readonly lines: readonly ParsedLine[];
  readonly rejected: readonly RejectedLine[];
  /** What the statement says the account held at the end, when it says. */
  readonly closingBalance: { readonly amount: Cents; readonly date: CalendarDate | null } | null;
}

export const READ_ERRORS = [
  'empty',
  'too-large',
  'unknown-format',
  'no-account',
  'several-accounts',
  'not-aud',
] as const;
export type ReadErrorCode = (typeof READ_ERRORS)[number];

export interface ReadError {
  readonly code: ReadErrorCode;
}
