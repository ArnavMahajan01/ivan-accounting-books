// The contacts list and a contact's page (spec 123; W08b, Option 1). Customers with what they owe
// and where their oldest unpaid invoice is up to; suppliers with what was paid to them this
// financial year and their latest bank line. A contact's page: owes you, invoiced and paid this
// year, then their invoices, payments, bank lines, details and the bank words linked to them.
// Every figure comes from the same places as the Invoices page (`invoices-view.ts`) and the
// Transactions list, so they always agree.

import { getContactById, getContactDetails, listContacts } from '@data/contact-repository';
import { listPayments } from '@data/invoice-payment-repository';
import { listContactMatches } from '@data/review-repository';
import { financialYearOf } from '@domain/periods';
import { compareDates, type CalendarDate } from '@shared/dates';
import type { ContactListRow, ContactPageView, ContactsView } from '@shared/contacts';
import type { InvoiceRowView } from '@shared/invoices';
import { asCents, sumCents, ZERO_CENTS } from '@shared/money';
import type { TodayContext } from './context';
import { invoicesView } from './invoices-view';
import { listTransactions } from './list-transactions';

/** As many bank lines as the contact page lists; the rest are in Transactions. */
export const CONTACT_LINES_SHOWN = 200;

const inYear = (date: CalendarDate, start: CalendarDate, end: CalendarDate) =>
  compareDates(date, start) >= 0 && compareDates(date, end) <= 0;

const isOwed = (r: InvoiceRowView) =>
  r.kind === 'invoice' && (r.status.kind === 'unpaid' || r.status.kind === 'overdue');

/** The invoice owed longest: the earliest due date, or the earliest issued when none is due. */
function oldestOwed(rows: readonly InvoiceRowView[]): InvoiceRowView | null {
  const owed = rows.filter(isOwed);
  owed.sort((a, b) => compareDates(a.dueDate ?? a.issueDate, b.dueDate ?? b.issueDate));
  return owed[0] ?? null;
}

export function contactsView(ctx: TodayContext): ContactsView {
  const year = financialYearOf(ctx.clock.today());
  const byContact = new Map<string, InvoiceRowView[]>();
  for (const r of invoicesView(ctx).rows) {
    byContact.set(r.contactId, [...(byContact.get(r.contactId) ?? []), r]);
  }
  const rows = listContacts(ctx.db)
    .filter((c) => c.active)
    .map((c): ContactListRow => {
      const invoices = byContact.get(c.id) ?? [];
      const spent = listTransactions(ctx, {
        contactId: c.id,
        from: year.start,
        to: year.end,
        kind: 'money-out',
        limit: 1,
      });
      const latest = listTransactions(ctx, { contactId: c.id, bankOnly: true, limit: 1 });
      return {
        id: c.id,
        name: c.name,
        kind: c.kind,
        createdFrom: c.createdFrom,
        createdAt: c.createdAt,
        owing: sumCents(invoices.filter(isOwed).map((r) => r.owing)),
        oldestUnpaid: oldestOwed(invoices)?.status ?? null,
        spentThisYear: spent.ok ? spent.value.totals.total : ZERO_CENTS,
        lastLine: latest.ok ? (latest.value.rows[0]?.date ?? null) : null,
      };
    });
  return { rows, yearLabel: year.label };
}

export function contactPage(ctx: TodayContext, id: string): ContactPageView | null {
  const contact = getContactById(ctx.db, id);
  const details = getContactDetails(ctx.db, id);
  if (contact === null || details === null) return null;
  const year = financialYearOf(ctx.clock.today());
  const invoices = invoicesView(ctx, id).rows;
  const numbers = new Set(invoices.map((r) => r.number));
  const payments = listPayments(ctx.db)
    .filter((p) => numbers.has(p.invoiceNumber))
    .map((p) => ({
      entryId: p.entryId,
      date: p.date,
      invoiceNumber: p.invoiceNumber,
      amount: p.amount,
    }))
    .reverse();
  const owed = invoices.filter(isOwed);
  const thisYear = invoices.filter((r) => inYear(r.issueDate, year.start, year.end));
  const issued = thisYear.filter((r) => r.kind === 'invoice');
  const credited = thisYear.filter((r) => r.kind === 'credit-note');
  const paidThisYear = payments.filter((p) => inYear(p.date, year.start, year.end));
  const lines = listTransactions(ctx, {
    contactId: id,
    bankOnly: true,
    limit: CONTACT_LINES_SHOWN,
  });
  return {
    contact: {
      id: contact.id,
      name: contact.name,
      kind: contact.kind,
      createdFrom: contact.createdFrom,
      createdAt: contact.createdAt,
      ...details,
    },
    yearLabel: year.label,
    owing: {
      cents: sumCents(owed.map((r) => r.owing)),
      count: owed.length,
      nextDue: oldestOwed(invoices)?.dueDate ?? null,
    },
    invoiced: {
      cents: asCents(sumCents(issued.map((r) => r.total)) - sumCents(credited.map((r) => r.total))),
      count: issued.length,
    },
    paid: { cents: sumCents(paidThisYear.map((p) => p.amount)), count: paidThisYear.length },
    invoices,
    payments,
    bankLines: lines.ok ? lines.value.rows : [],
    moreBankLines: lines.ok ? Math.max(0, lines.value.matching - lines.value.rows.length) : 0,
    words: listContactMatches(ctx.db)
      .filter((m) => m.contactId === id)
      .map((m) => m.words),
  };
}
