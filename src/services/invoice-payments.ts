// Payments matched to invoices (spec 129). Until a deposit is matched, there are none.

import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';

export interface InvoicePayment {
  readonly entryId: string;
  readonly date: CalendarDate;
  readonly amount: Cents;
}

/** Every payment matched to an invoice, by invoice id. */
export function paymentsByInvoice(): Map<string, InvoicePayment[]> {
  return new Map();
}
