// An invoice or credit note from the Admin Dashboard as a journal entry (spec 126). Pure. An
// invoice is money owed to him: accounts receivable up by the total, sales up by each line before
// GST, and the GST on sales owed to the ATO. A credit note is the same the other way round. The GST
// is the Admin Dashboard's own, per line (client question 27's assumption): never worked out again.

import type { Id } from '@shared/ids';
import { asCents, negateCents, sumCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { CalendarDate } from '@shared/dates';
import type { EntryInput, EntryLineInput } from './journal';

/** What the posting needs of an invoice or credit note. */
export interface InvoiceForPosting {
  readonly kind: 'invoice' | 'credit-note';
  readonly number: string;
  readonly issueDate: CalendarDate;
  readonly lines: readonly {
    readonly description: string;
    readonly gstCode: string;
    /** GST-inclusive, positive. */
    readonly total: Cents;
    readonly gst: Cents;
  }[];
}

export interface InvoiceAccounts {
  readonly receivables: Id<'acc'>;
  readonly sales: Id<'acc'>;
  readonly gst: Id<'acc'>;
  /** The books' GST code for the Admin Dashboard's short code, or null if there is none. */
  readonly taxCode: (shortCode: string) => Id<'tax'> | null;
}

export type InvoiceEntryError = 'unknown-gst-code' | 'nothing-to-post';

export function invoiceToEntry(
  doc: InvoiceForPosting,
  contactId: string,
  accounts: InvoiceAccounts,
): Result<EntryInput, InvoiceEntryError> {
  // Sales and GST are credits on an invoice, debits on a credit note.
  const sign = (cents: Cents): Cents => (doc.kind === 'invoice' ? negateCents(cents) : cents);
  const sales: EntryLineInput[] = [];
  for (const line of doc.lines) {
    const net = asCents(line.total - line.gst);
    if (net === 0 && line.gst === 0) continue;
    const taxCodeId = accounts.taxCode(line.gstCode);
    if (taxCodeId === null) return err('unknown-gst-code');
    sales.push({
      accountId: accounts.sales,
      amount: sign(net),
      taxCodeId,
      gst: sign(line.gst),
      payeeId: contactId,
      memo: line.description,
    });
  }
  if (sales.length === 0) return err('nothing-to-post');
  const gstTotal = sumCents(sales.map((l) => l.gst));
  const gstLine: EntryLineInput[] =
    gstTotal === 0
      ? []
      : [
          {
            accountId: accounts.gst,
            amount: gstTotal,
            taxCodeId: null,
            gst: asCents(0),
            payeeId: null,
            memo: '',
          },
        ];
  const receivable: EntryLineInput = {
    accountId: accounts.receivables,
    amount: negateCents(sumCents([...sales.map((l) => l.amount), ...gstLine.map((l) => l.amount)])),
    taxCodeId: null,
    gst: asCents(0),
    payeeId: contactId,
    memo: '',
  };
  return ok({
    date: doc.issueDate,
    memo: `${doc.kind === 'invoice' ? 'Invoice' : 'Credit note'} ${doc.number}`,
    sourceKind: 'invoice',
    sourceId: doc.number,
    lines: [receivable, ...sales, ...gstLine],
  });
}
