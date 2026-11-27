// Invoices and what is owed on them (specs 126, 128; W08a, Option 3): each current invoice with
// what is still owed and where it is up to in words (unpaid and when due, overdue by how many
// days, or paid and when), and the summary bands: unpaid, overdue, paid in the last 30 days. Owed
// is the total less the credit notes for it and the payments matched to it (spec 129).

import { listContacts } from '@data/contact-repository';
import { listCurrentInvoices, type InvoiceRow } from '@data/invoice-repository';
import { addDays, compareDates, daysBetween, type CalendarDate } from '@shared/dates';
import { asCents, sumCents, ZERO_CENTS, type Cents } from '@shared/money';
import type { InvoiceRowView, InvoicesView, InvoiceStatus } from '@shared/invoices';
import type { TodayContext } from './context';
import { paymentsByInvoice } from './invoice-payments';

function statusOf(
  invoice: InvoiceRow,
  owing: Cents,
  lastPaid: CalendarDate | null,
  today: CalendarDate,
): InvoiceStatus {
  if (invoice.kind === 'credit-note') return { kind: 'credit', forNumber: invoice.creditFor };
  if (owing <= 0) return { kind: 'paid', on: lastPaid };
  if (invoice.dueDate !== null && compareDates(invoice.dueDate, today) < 0) {
    return { kind: 'overdue', days: daysBetween(invoice.dueDate, today) };
  }
  return { kind: 'unpaid', due: invoice.dueDate };
}

export function invoicesView(ctx: TodayContext, contactId: string | null = null): InvoicesView {
  const today = ctx.clock.today();
  const all = listCurrentInvoices(ctx.db);
  const names = new Map(listContacts(ctx.db).map((c) => [c.id as string, c.name]));
  const payments = paymentsByInvoice(ctx);
  const credits = new Map<string, Cents>();
  for (const c of all) {
    if (c.kind === 'credit-note' && c.creditFor !== null) {
      credits.set(c.creditFor, asCents((credits.get(c.creditFor) ?? 0) + c.total));
    }
  }
  const rows: InvoiceRowView[] = all
    .filter((inv) => contactId === null || inv.contactId === contactId)
    .map((inv) => {
      const paid = payments.get(inv.id) ?? [];
      const owing =
        inv.kind === 'credit-note'
          ? ZERO_CENTS
          : asCents(
              Math.max(
                0,
                inv.total - (credits.get(inv.number) ?? 0) - sumCents(paid.map((p) => p.amount)),
              ),
            );
      const lastPaid = paid.reduce<CalendarDate | null>(
        (latest, p) => (latest === null || compareDates(p.date, latest) > 0 ? p.date : latest),
        null,
      );
      return {
        id: inv.id,
        kind: inv.kind,
        number: inv.number,
        version: inv.version,
        contactId: inv.contactId,
        customer: names.get(inv.contactId) ?? '',
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total: inv.total,
        gst: inv.gst,
        owing,
        status: statusOf(inv, owing, lastPaid, today),
        hasPdf: inv.pdf !== null,
      };
    });
  const invoices = rows.filter((r) => r.kind === 'invoice');
  const unpaid = invoices.filter((r) => r.status.kind === 'unpaid');
  const overdue = invoices.filter((r) => r.status.kind === 'overdue');
  const since = addDays(today, -30);
  const paidRecently = [...payments.entries()].flatMap(([id, list]) =>
    rows.some((r) => r.id === id) ? list.filter((p) => compareDates(p.date, since) >= 0) : [],
  );
  return {
    rows,
    unpaid: { cents: sumCents(unpaid.map((r) => r.owing)), count: unpaid.length },
    overdue: { cents: sumCents(overdue.map((r) => r.owing)), count: overdue.length },
    paidLast30: { cents: sumCents(paidRecently.map((p) => p.amount)), count: paidRecently.length },
  };
}
