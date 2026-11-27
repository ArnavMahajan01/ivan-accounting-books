// What the screens are told about invoices from the Admin Dashboard (folder 10).

import type { CalendarDate } from './dates';
import type { Cents } from './money';

/** One invoice or credit note in a preview, before it is added to the books. */
export interface InvoicePreviewDoc {
  readonly kind: 'invoice' | 'credit-note';
  readonly number: string;
  readonly version: number;
  readonly customer: string;
  /** A customer the books do not have yet: saved as a contact when added. */
  readonly newCustomer: boolean;
  readonly issueDate: CalendarDate;
  readonly dueDate: CalendarDate | null;
  readonly total: Cents;
  readonly gst: Cents;
}

/** What adding a file would do (spec 126; W08a, Option 1). Nothing is saved yet. */
export interface InvoicePreview {
  readonly fileName: string;
  readonly added: readonly InvoicePreviewDoc[];
  /** Already in the books, same version: skipped. */
  readonly already: number;
  /** A newer version of an invoice already in the books: its entry is changed to match. */
  readonly replaced: readonly (InvoicePreviewDoc & { readonly wasTotal: Cents })[];
  /** Not added, with why: dated in a locked period, or a version older than the books have. */
  readonly refused: readonly {
    readonly number: string;
    readonly reason: 'locked' | 'older-version' | 'unknown-gst-code';
  }[];
  readonly quotes: number;
  readonly total: Cents;
  readonly gst: Cents;
}

export type InvoicePreviewOutcome =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'preview'; readonly previewId: string; readonly preview: InvoicePreview }
  | { readonly kind: 'refused'; readonly field: string; readonly problem: string };

export type InvoiceCommitOutcome =
  | { readonly kind: 'added'; readonly added: number; readonly replaced: number }
  | { readonly kind: 'refused'; readonly reason: 'no-such-preview' | 'nothing-new' | 'not-set-up' };

/** Where an invoice is up to (spec 128): words, never colour alone. */
export type InvoiceStatus =
  | { readonly kind: 'unpaid'; readonly due: CalendarDate | null }
  | { readonly kind: 'overdue'; readonly days: number }
  | { readonly kind: 'paid'; readonly on: CalendarDate | null }
  /** A credit note: it reduces what the customer owes. */
  | { readonly kind: 'credit'; readonly forNumber: string | null };

export interface InvoiceRowView {
  readonly id: string;
  readonly kind: 'invoice' | 'credit-note';
  readonly number: string;
  readonly version: number;
  readonly contactId: string;
  readonly customer: string;
  readonly issueDate: CalendarDate;
  readonly dueDate: CalendarDate | null;
  readonly total: Cents;
  readonly gst: Cents;
  /** Still owed on an invoice; zero on a credit note. */
  readonly owing: Cents;
  readonly status: InvoiceStatus;
  /** A PDF the Admin Dashboard wrote beside the file, to open. */
  readonly hasPdf: boolean;
}

/** The Invoices page (W08a, Options 2 and 3): the summary bands, then every invoice. */
export interface InvoicesView {
  readonly rows: readonly InvoiceRowView[];
  readonly unpaid: { readonly cents: Cents; readonly count: number };
  readonly overdue: { readonly cents: Cents; readonly count: number };
  readonly paidLast30: { readonly cents: Cents; readonly count: number };
}
