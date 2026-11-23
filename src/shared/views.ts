// What the main process tells the screens (context/code-standards.md, "Bridge"). These are the
// shapes of the results of the bridge functions, written down once here so both sides agree. They
// hold only what a screen needs to show, never a database row.

import type { CalendarDate, Timestamp } from './dates';
import type { AccountType, BooksProblem, EntrySourceKind, TaxTreatment } from './kinds';
import type { Cents } from './money';

// ---- Which books are open ---------------------------------------------------------------------

export type BooksMode = 'real' | 'sample';

export interface BooksState {
  readonly mode: BooksMode;
  /** The business's name, or null before one is set. */
  readonly businessName: string | null;
  /** Whether sample data can be loaded and cleared. Off in the build that goes to the client. */
  readonly sampleSwitch: boolean;
  /** First launch, with empty books: offer sample data or his own books. */
  readonly needsStartChoice: boolean;
}

// ---- Home -------------------------------------------------------------------------------------

export const NEXT_STEP_IDS = [
  'review-lines',
  'reconcile',
  'back-up',
  'bas-due',
  'accountant-changes',
] as const;
export type NextStepId = (typeof NEXT_STEP_IDS)[number];

/** A job on Home, with its facts. A `done` job is shown ticked. */
export type NextStep =
  | {
      readonly id: 'review-lines';
      readonly state: 'todo' | 'done';
      readonly count: number;
      readonly oldest: CalendarDate | null;
    }
  | {
      readonly id: 'reconcile';
      readonly state: 'todo';
      readonly accountName: string;
      readonly statementDate: CalendarDate;
      readonly statementBalance: Cents;
    }
  | { readonly id: 'back-up'; readonly state: 'todo' | 'done'; readonly daysSince: number | null }
  | {
      readonly id: 'bas-due';
      readonly state: 'todo';
      readonly periodLabel: string;
      readonly dueDate: CalendarDate;
      readonly daysToDue: number;
      /** The quarter has ended, so the worksheet can be opened. */
      readonly ready: boolean;
    }
  | { readonly id: 'accountant-changes'; readonly state: 'todo' | 'done'; readonly count: number };

export interface HomeSummary {
  /** No entries yet: Home shows the getting-started list instead of numbers. */
  readonly brandNew: boolean;
  /** Bank accounts, added up, as at today. */
  readonly bank: { readonly balance: Cents; readonly accountCount: number };
  /** Zero until bank lines are imported (folder 05). */
  readonly linesToReview: { readonly count: number; readonly oldest: CalendarDate | null };
  /** What is owed to the ATO for the BAS period in progress, from the GST on the entries. */
  readonly gst: {
    readonly owing: Cents;
    /** `Oct–Dec 2026`. */
    readonly periodLabel: string;
    readonly periodEnd: CalendarDate;
  };
  /** Income less expenses for the financial year so far. */
  readonly profit: {
    readonly amount: Cents;
    /** `FY 2026–27`. */
    readonly yearLabel: string;
    readonly from: CalendarDate;
  };
  readonly nextSteps: readonly NextStep[];
  /** Whether every job shown is done, or none is shown. */
  readonly upToDate: boolean;
  /** What the books check found wrong. Empty means all is well. */
  readonly warnings: readonly BooksProblem[];
}

// ---- Accounts ---------------------------------------------------------------------------------

export interface AccountRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  readonly active: boolean;
  /** How GST usually treats this account, or null if no code is set. */
  readonly usualGst: { readonly shortCode: string; readonly treatment: TaxTreatment } | null;
  /** In the books, as at today. A debit is positive and a credit is negative. */
  readonly balance: Cents;
  /** Set for one of his bank accounts. */
  readonly bank: { readonly bank: string; readonly lastFour: string } | null;
}

export interface AccountsView {
  readonly asAt: CalendarDate;
  readonly accounts: readonly AccountRow[];
}

// ---- Transactions -----------------------------------------------------------------------------

export const TRANSACTION_KINDS = ['all', 'money-in', 'money-out', 'transfers'] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/** Ready-made date ranges for the list. A range the person types is sent as `from` and `to` instead. */
export const TRANSACTION_PERIODS = [
  'last-12-months',
  'financial-year',
  'bas-period',
  'all',
] as const;
export type TransactionPeriod = (typeof TRANSACTION_PERIODS)[number];

/** Money in or out of a bank account, a move between two of them, or an entry touching none. */
export type EntryDirection = 'in' | 'out' | 'transfer' | 'journal';

export interface TransactionRow {
  readonly id: string;
  readonly date: CalendarDate;
  readonly sourceKind: EntrySourceKind;
  readonly direction: EntryDirection;
  readonly payee: string | null;
  readonly memo: string;
  /** The account it was for. */
  readonly account: { readonly id: string; readonly code: string; readonly name: string } | null;
  readonly beforeGst: Cents;
  readonly gst: Cents;
  readonly total: Cents;
  /** On or before the lock date, so it cannot change. */
  readonly locked: boolean;
}

export interface TransactionsPage {
  readonly rows: readonly TransactionRow[];
  /** The days the list covers, both included. Null means no limit on that side. */
  readonly range: { readonly from: CalendarDate | null; readonly to: CalendarDate | null };
  /** How many entries match the filters, across every page. */
  readonly matching: number;
  readonly offset: number;
  readonly limit: number;
  /** Added up over every matching entry, not only this page. */
  readonly totals: { readonly beforeGst: Cents; readonly gst: Cents; readonly total: Cents };
  /** With an account filter: that account's lines in the matching entries, which match its trial balance. */
  readonly accountTotal: Cents | null;
}

export interface TransactionLineView {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly debit: Cents;
  readonly credit: Cents;
  readonly gst: Cents;
  /** The short code, such as `GST`, or null. */
  readonly taxCode: string | null;
  readonly payee: string | null;
}

export interface TransactionHistoryItem {
  readonly kind: 'posted' | 'changed';
  readonly at: Timestamp;
  /** What changed, in plain words. Empty for a posting. */
  readonly changes: readonly string[];
}

export interface TransactionDetail {
  readonly id: string;
  readonly date: CalendarDate;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
  readonly payee: string | null;
  readonly lines: readonly TransactionLineView[];
  readonly beforeGst: Cents;
  readonly gst: Cents;
  readonly total: Cents;
  readonly locked: boolean;
  /** Oldest first. */
  readonly history: readonly TransactionHistoryItem[];
}
