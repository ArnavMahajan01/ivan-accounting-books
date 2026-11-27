// What the main process tells the screens (context/code-standards.md, "Bridge"). These are the
// shapes of the results of the bridge functions, written down once here so both sides agree. They
// hold only what a screen needs to show, never a database row.

import type { InvoiceSuggestion } from './invoices';
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
  'invoices-overdue',
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
  | { readonly id: 'accountant-changes'; readonly state: 'todo' | 'done'; readonly count: number }
  /** Invoices from the Admin Dashboard past their due date and not paid (spec 128). */
  | {
      readonly id: 'invoices-overdue';
      readonly state: 'todo';
      readonly count: number;
      readonly cents: Cents;
    };

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
  /** The GST code a line to it starts with, by id (spec 084). */
  readonly usualTaxCodeId: string | null;
  readonly parentId: string | null;
  /** Lines are posted to it, so deactivating it warns (spec 084). */
  readonly hasPostedLines: boolean;
}

export interface AccountsView {
  readonly asAt: CalendarDate;
  readonly accounts: readonly AccountRow[];
  /** The GST codes, for an account's usual code (spec 084). */
  readonly taxCodes: readonly {
    readonly id: string;
    readonly shortCode: string;
    readonly name: string;
  }[];
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
  /** Money through one bank account for one account, so the account can be changed in the row. */
  readonly movable: boolean;
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

// ---- Bank and importing a statement file ---------------------------------------------------------

export interface BankAccountRow {
  readonly id: string;
  readonly name: string;
  readonly lastFour: string;
  /** In the books, as at today: what the ledger holds for the account. */
  readonly balance: Cents;
  /** The balance the latest imported statement states, and the day it was as at. */
  readonly lastStatement: { readonly balance: Cents; readonly date: CalendarDate } | null;
  /** Lines imported for this account that still wait for review. */
  readonly linesToReview: number;
  /** Filled in by reconciling (folder 07). */
  readonly reconciledTo: CalendarDate | null;
  /** Set for a sub-account: the id of the account it sits under. */
  readonly parentId: string | null;
  /** The file imported last, while it can still be taken back (spec 063a). */
  readonly undoableImport: {
    readonly batchId: string;
    readonly fileName: string;
    /** How many lines it added. */
    readonly added: number;
    readonly period: { readonly from: CalendarDate; readonly to: CalendarDate };
  } | null;
}

export interface BankView {
  readonly accounts: readonly BankAccountRow[];
}

/** Why a file could not be previewed, in terms the page words for him. */
export const IMPORT_REFUSALS = [
  'empty',
  'too-large',
  'unreadable-file',
  'unknown-format',
  'no-account',
  'several-accounts',
  'not-aud',
  'no-transactions',
  'unknown-account',
  'ambiguous-account',
  'inactive-account',
] as const;
export type ImportRefusal = (typeof IMPORT_REFUSALS)[number];

export const REJECTION_CODES = [
  'missing-date',
  'not-a-date',
  'impossible-date',
  'missing-amount',
  'not-an-amount',
  'too-many-decimals',
  'amount-too-large',
  'zero-amount',
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number];

export type ImportLineView =
  | {
      readonly status: 'new' | 'duplicate';
      readonly position: number;
      readonly date: CalendarDate;
      readonly description: string;
      readonly amount: Cents;
    }
  | {
      readonly status: 'rejected';
      readonly position: number;
      /** The line of the file the transaction starts on. */
      readonly fileLine: number;
      readonly reason: RejectionCode;
      /** The text that could not be read, as the file has it. */
      readonly value: string | null;
      readonly description: string;
      readonly amount: Cents | null;
    };

export type ImportBalanceView =
  | {
      readonly kind: 'match';
      readonly closing: Cents;
      readonly closingDate: CalendarDate | null;
    }
  | {
      readonly kind: 'difference';
      readonly closing: Cents;
      readonly closingDate: CalendarDate | null;
      /** What the lines held for the account add up to after the import. */
      readonly expected: Cents;
      readonly difference: Cents;
      readonly explainedByRejected: boolean;
    }
  | {
      readonly kind: 'first-file' | 'no-starting-point';
      readonly closing: Cents;
      readonly closingDate: CalendarDate | null;
    }
  | { readonly kind: 'no-closing-balance' };

export interface ImportPreview {
  /** Names this preview when the import is confirmed. Held in memory only, never saved. */
  readonly previewId: string;
  readonly fileName: string;
  readonly account: { readonly id: string; readonly name: string; readonly lastFour: string };
  readonly period: { readonly from: CalendarDate; readonly to: CalendarDate } | null;
  readonly counts: {
    readonly new: number;
    readonly duplicate: number;
    readonly rejected: number;
  };
  readonly balance: ImportBalanceView;
  /** Every transaction in the file, in the file's order. */
  readonly lines: readonly ImportLineView[];
}

export type PreviewOutcome =
  | { readonly kind: 'preview'; readonly preview: ImportPreview }
  | {
      readonly kind: 'refused';
      readonly reason: ImportRefusal;
      /** The last four digits of the account the file is for, when that is why it was refused. */
      readonly lastFour: string | null;
    }
  /** The Mac's file chooser was closed without a file. */
  | { readonly kind: 'cancelled' };

export type UndoOutcome =
  | { readonly kind: 'undone'; readonly removed: number; readonly fileName: string }
  | {
      readonly kind: 'refused';
      readonly reason: 'not-found' | 'not-the-latest' | 'lines-already-used';
    };

export type CommitOutcome =
  | {
      readonly kind: 'imported';
      readonly added: number;
      readonly skipped: number;
      readonly rejected: number;
      readonly accountName: string;
      /** Lines a "post by itself" rule posted straight away (spec 081), for Undo. */
      readonly postedByRules: readonly string[];
      /** Lines a rule fitted but could not post, such as in a locked period. They wait in To review. */
      readonly rulesCouldNot: number;
    }
  /** The preview is gone (the books changed, or it was used already) or there was nothing new in it. */
  | { readonly kind: 'refused'; readonly reason: 'no-such-preview' | 'nothing-new' };

// ---- To review (folder 06) ----------------------------------------------------------------------

export const REVIEW_SHOWS = ['all', 'suggested', 'no-suggestion'] as const;
export type ReviewShow = (typeof REVIEW_SHOWS)[number];

/** Why the app suggests an account for a line, in the words under the account box. */
export type SuggestionReason = 'from-your-rule' | 'same-as-last-time' | 'best-guess';

export interface ReviewLineView {
  readonly id: string;
  readonly date: CalendarDate;
  readonly description: string;
  /** Money in is positive, money out negative. Spent and Received are worked out from it. */
  readonly amount: Cents;
  readonly bankAccountId: string;
  readonly bankAccountName: string;
  /** From/To: the contact saved for these words, or the one used last time. */
  readonly payee: { readonly contactId: string; readonly name: string } | null;
  /** An account, GST code and payee from how similar lines were posted before (spec 074). */
  readonly suggestion: {
    readonly accountId: string;
    readonly taxCodeId: string | null;
    readonly reason: SuggestionReason;
    /** The rule it came from (spec 079). A split rule gives its parts, and posts them all. */
    readonly rule: {
      readonly id: string;
      readonly name: string;
      readonly split:
        readonly { readonly accountName: string; readonly percentBp: number }[] | null;
    } | null;
  } | null;
  /** An entry already in the books that this line is the bank's record of (spec 069a). */
  readonly match: {
    readonly entryId: string;
    readonly date: CalendarDate;
    /** The entry's payee, or its memo. */
    readonly text: string;
  } | null;
  /** Invoices this deposit may pay (spec 129). Empty for money out. */
  readonly invoices: readonly InvoiceSuggestion[];
  /** The other side of a transfer, in another of his accounts (spec 073). */
  readonly transfer: {
    readonly lineId: string;
    readonly bankAccountId: string;
    readonly bankAccountName: string;
    readonly date: CalendarDate;
    /** The other side is already posted, waiting in the transfers account. */
    readonly alreadyPosted: boolean;
  } | null;
}

export interface ReviewAccountChoice {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  /** The GST code a line to this account starts with. */
  readonly defaultTaxCodeId: string | null;
}

export interface ReviewView {
  /** The lines that fit the filters, oldest first, up to `REVIEW_PAGE_LIMIT`. */
  readonly lines: readonly ReviewLineView[];
  /** How many lines fit the bank account and search filters, by what the app has for them. */
  readonly counts: {
    readonly all: number;
    readonly suggested: number;
    readonly noSuggestion: number;
  };
  /** Every line waiting, whatever the filters: the count beside To review in the sidebar. */
  readonly waiting: number;
  readonly bankAccounts: readonly { readonly id: string; readonly name: string }[];
  /** Accounts a line can be posted to. His bank accounts are reached with Transfer instead. */
  readonly accounts: readonly ReviewAccountChoice[];
  readonly taxCodes: readonly {
    readonly id: string;
    readonly shortCode: string;
    readonly name: string;
  }[];
  readonly contacts: readonly { readonly id: string; readonly name: string }[];
}

/** At most this many lines are listed at once, oldest first. Posting them brings up the next. */
export const REVIEW_PAGE_LIMIT = 200;

/** What to do with one line. */
export type ReviewAction =
  | {
      readonly kind: 'account';
      readonly lineId: string;
      /** Null when he has not chosen one: the line is reported as needing an account. */
      readonly accountId: string | null;
      readonly taxCodeId: string | null;
      readonly payeeId: string | null;
    }
  | { readonly kind: 'match'; readonly lineId: string; readonly entryId: string }
  /** Posts the line the way the rule says. A payee he typed comes before the rule's. */
  | {
      readonly kind: 'rule';
      readonly lineId: string;
      readonly ruleId: string;
      readonly payeeId: string | null;
    }
  | { readonly kind: 'transfer'; readonly lineId: string; readonly otherBankAccountId: string };

export const POST_FAILURES = [
  'needs-account',
  'not-found',
  'not-waiting',
  'locked',
  'inactive-account',
  'use-transfer',
  'no-longer-matches',
  'not-set-up',
  'invalid',
] as const;
export type PostFailure = (typeof POST_FAILURES)[number];

export interface PostOutcome {
  /** The lines posted, in the order asked. Undo takes these. */
  readonly posted: readonly string[];
  /** Lines posted alongside, such as the other side of a transfer. */
  readonly alsoPosted: readonly string[];
  readonly failed: readonly { readonly lineId: string; readonly reason: PostFailure }[];
}

export type UndoPostOutcome =
  | { readonly kind: 'undone'; readonly lines: number }
  | { readonly kind: 'refused'; readonly reason: 'locked' | 'not-posted' | 'reconciled' };

export type SavePayeeOutcome =
  | {
      readonly kind: 'saved';
      readonly contactId: string;
      readonly name: string;
      /** A new contact was made, rather than an existing one used. */
      readonly created: boolean;
      readonly kindOfContact: 'customer' | 'supplier' | 'both';
      /** The words that now point to the contact, kept for Undo. */
      readonly words: string;
      /** Other waiting lines that now show this contact. */
      readonly alsoFilled: number;
    }
  | { readonly kind: 'refused'; readonly reason: 'not-found' | 'empty-name' | 'no-words' };

// ---- Bank rules (folder 07) ---------------------------------------------------------------------

/** What testing a rule found (spec 080): how many lines it fits, and the first of them. */
export interface RuleTestResult {
  readonly waiting: number;
  readonly posted: number;
  readonly lines: readonly {
    readonly id: string;
    readonly date: CalendarDate;
    readonly description: string;
    readonly amount: Cents;
    readonly status: 'to-review' | 'posted';
  }[];
}

/** What moving entries to another account did (spec 083). */
export interface MoveOutcome {
  readonly moved: readonly string[];
  readonly failed: readonly {
    readonly entryId: string;
    readonly reason: 'not-found' | 'locked' | 'not-movable' | 'unchanged' | 'invalid';
  }[];
}

// ---- Reconciling (folder 07) --------------------------------------------------------------------

export interface ReconcileView {
  readonly accountName: string;
  readonly statementDate: CalendarDate;
  readonly statementBalance: Cents;
  /** What the posted lines in the books add up to on that day. */
  readonly booksBalance: Cents;
  /** Statement less books. Zero means it can be finished. */
  readonly difference: Cents;
  /** Lines of the account still in To review on or before the day: what usually explains a difference. */
  readonly waiting: readonly {
    readonly id: string;
    readonly date: CalendarDate;
    readonly description: string;
    readonly amount: Cents;
  }[];
  /** Posting the waiting lines would make the difference zero. */
  readonly explainedByWaiting: boolean;
  readonly lastReconciled: CalendarDate | null;
}

export type ReconcileOutcome =
  | { readonly kind: 'done'; readonly lines: number }
  | { readonly kind: 'refused'; readonly reason: 'not-found' | 'before-last' | 'difference' };

export type AccountEditOutcome =
  | { readonly kind: 'saved'; readonly id: string }
  | {
      readonly kind: 'refused';
      readonly reason:
        | 'empty-code'
        | 'empty-name'
        | 'code-in-use'
        | 'not-found'
        | 'parent-not-found'
        | 'unchanged'
        | 'already-inactive'
        | 'already-active'
        | 'bank-account';
    };

// ---- Reports (folder 08) ------------------------------------------------------------------------

/** The lines behind a report figure (spec 093). `total` is always the figure clicked. */
export interface DrillView {
  readonly title: string;
  readonly lines: readonly {
    readonly entryId: string;
    readonly date: CalendarDate;
    readonly payee: string | null;
    readonly description: string;
    readonly account: string;
    readonly beforeGst: Cents;
    readonly gst: Cents;
    readonly total: Cents;
  }[];
  readonly total: Cents;
  readonly totalLabel: string;
  /** For "Open in Transactions". Null for a BAS label, which spans accounts. */
  readonly accountId: string | null;
}

/** Closing a quarter (spec 097): each step, then the lock. */
export interface QuarterCloseView {
  readonly period: {
    readonly from: CalendarDate;
    readonly to: CalendarDate;
    readonly label: string;
  };
  /** Bank lines dated in the quarter still waiting in To review. */
  readonly linesWaiting: number;
  readonly accounts: readonly {
    readonly id: string;
    readonly name: string;
    readonly reconciledTo: CalendarDate | null;
    /** Reconciled to the quarter's end or later. */
    readonly done: boolean;
  }[];
  readonly bas: { readonly g1: Cents; readonly a1: Cents; readonly b1: Cents; readonly net: Cents };
  /** The quarter is locked already. */
  readonly locked: boolean;
  readonly lockDate: CalendarDate | null;
}

export type LockOutcome =
  | { readonly kind: 'locked'; readonly lockDate: CalendarDate }
  | { readonly kind: 'refused'; readonly reason: 'not-forwards' | 'not-set-up' };

export interface LayoutSummary {
  readonly id: string;
  readonly name: string;
  readonly report: 'profit-and-loss' | 'balance-sheet' | 'trial-balance' | 'bas';
}
