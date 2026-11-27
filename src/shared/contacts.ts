// What the screens are told about contacts (spec 123; W08b, Options 1 and 3).

import type { CalendarDate } from './dates';
import type { InvoiceRowView, InvoiceStatus } from './invoices';
import type { ContactKind, ContactSource } from './kinds';
import type { Cents } from './money';
import type { TransactionRow } from './views';

/** One row of the contacts list. A contact that is both shows in both tabs. */
export interface ContactListRow {
  readonly id: string;
  readonly name: string;
  readonly kind: ContactKind;
  readonly createdFrom: ContactSource;
  /** When it was saved: a timestamp, shown as a day in the Mac's own time zone. */
  readonly createdAt: string;
  /** Still owed on their invoices. */
  readonly owing: Cents;
  /** Where the oldest invoice not yet paid is up to, or null when nothing is owed. */
  readonly oldestUnpaid: InvoiceStatus | null;
  /** Money paid to them from his bank accounts this financial year. */
  readonly spentThisYear: Cents;
  /** The day of their latest bank line, or null. */
  readonly lastLine: CalendarDate | null;
}

export interface ContactsView {
  readonly rows: readonly ContactListRow[];
  /** Such as "FY 2026–27". */
  readonly yearLabel: string;
}

export interface ContactPayment {
  readonly entryId: string;
  readonly date: CalendarDate;
  readonly invoiceNumber: string;
  readonly amount: Cents;
}

/** Everything about one contact (W08b, Option 1). */
export interface ContactPageView {
  readonly contact: {
    readonly id: string;
    readonly name: string;
    readonly kind: ContactKind;
    readonly createdFrom: ContactSource;
    readonly createdAt: string;
    readonly email: string | null;
    readonly phone: string | null;
    readonly abn: string | null;
    readonly notes: string;
  };
  readonly yearLabel: string;
  /** Owed on every invoice, whenever issued; `nextDue` is the earliest due date among them. */
  readonly owing: {
    readonly cents: Cents;
    readonly count: number;
    readonly nextDue: CalendarDate | null;
  };
  /** Invoices issued this financial year, less credit notes issued this year. */
  readonly invoiced: { readonly cents: Cents; readonly count: number };
  /** Payments matched to their invoices this financial year. */
  readonly paid: { readonly cents: Cents; readonly count: number };
  readonly invoices: readonly InvoiceRowView[];
  readonly payments: readonly ContactPayment[];
  /** Their bank lines, newest first. */
  readonly bankLines: readonly TransactionRow[];
  /** Bank lines beyond those listed, seen in Transactions. */
  readonly moreBankLines: number;
  /** Bank description words that give new lines this contact by themselves. */
  readonly words: readonly string[];
}

export type ContactSaveOutcome =
  | { readonly kind: 'saved'; readonly id: string }
  | {
      readonly kind: 'refused';
      readonly reason: 'empty-name' | 'name-in-use' | 'bad-email' | 'bad-abn' | 'not-found';
    };

/** Why two contacts look the same (spec 124), strongest first. */
export type ContactPairReason = 'same-abn' | 'same-bank-words' | 'similar-names';

/** Two contacts that look like one, offered for merging. */
export interface ContactPairView {
  readonly first: { readonly id: string; readonly name: string };
  readonly second: { readonly id: string; readonly name: string };
  readonly reason: ContactPairReason;
}

export type ContactMergeOutcome =
  | { readonly kind: 'merged'; readonly moved: number }
  | { readonly kind: 'kept' }
  | { readonly kind: 'refused'; readonly reason: 'not-found' | 'same-contact' | 'locked' };
