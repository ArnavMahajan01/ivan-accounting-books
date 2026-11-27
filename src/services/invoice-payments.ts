// Payments matched to invoices (spec 129; W08a, Option 4). A deposit waiting in To review is
// matched to the invoice it pays (suggested by amount, or by the invoice number in the bank's
// description), or shared across several, leaving part payments owing; anything left over goes to
// an account. It posts through To review's own path (`postSplitLine`): the bank up, accounts
// receivable down, so the books balance, and the payment is recorded against each invoice.
//
// On the cash basis, a payment also brings its share of the invoice's sales and GST into the BAS
// for the period it arrives in (`paymentBasLines`), net of any credit note for that invoice, with
// the shares rounded so that a fully paid invoice adds up exactly.

import { accountForRole } from '@data/account-role-repository';
import { getContactById } from '@data/contact-repository';
import { invoiceLines, listCurrentInvoices } from '@data/invoice-repository';
import { insertPayment, listPayments, type PaymentRow } from '@data/invoice-payment-repository';
import type { ReportLine } from '@data/report-queries';
import { getReviewLine } from '@data/review-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { compareDates, type CalendarDate } from '@shared/dates';
import { newId } from '@shared/ids';
import { asCents, sumCents, type Cents } from '@shared/money';
import type { InvoiceSuggestion } from '@shared/invoices';
import { err, ok, type Result } from '@shared/result';
import type { TaxTreatment } from '@shared/kinds';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import type { PostFailure } from '@shared/views';
import { postSplitLine } from './post-line';

export interface InvoicePayment {
  readonly entryId: string;
  readonly date: CalendarDate;
  readonly amount: Cents;
}

/** Every payment matched to an invoice, by the current invoice's id. */
export function paymentsByInvoice(ctx: ReadContext): Map<string, InvoicePayment[]> {
  const byNumber = new Map<string, InvoicePayment[]>();
  for (const p of listPayments(ctx.db)) {
    const list = byNumber.get(p.invoiceNumber) ?? [];
    list.push({ entryId: p.entryId, date: p.date, amount: p.amount });
    byNumber.set(p.invoiceNumber, list);
  }
  const out = new Map<string, InvoicePayment[]>();
  for (const inv of listCurrentInvoices(ctx.db)) {
    const list = byNumber.get(inv.number);
    if (list !== undefined) out.set(inv.id, list);
  }
  return out;
}

/** What is still owed on each current invoice, by number: total less credit notes and payments. */
export function owingByNumber(
  ctx: ReadContext,
): Map<string, { owing: Cents; contactId: string; dueDate: CalendarDate | null }> {
  const all = listCurrentInvoices(ctx.db);
  const credits = new Map<string, number>();
  for (const c of all) {
    if (c.kind === 'credit-note' && c.creditFor !== null) {
      credits.set(c.creditFor, (credits.get(c.creditFor) ?? 0) + c.total);
    }
  }
  const paid = new Map<string, number>();
  for (const p of listPayments(ctx.db))
    paid.set(p.invoiceNumber, (paid.get(p.invoiceNumber) ?? 0) + p.amount);
  const out = new Map<string, { owing: Cents; contactId: string; dueDate: CalendarDate | null }>();
  for (const inv of all) {
    if (inv.kind !== 'invoice') continue;
    out.set(inv.number, {
      owing: asCents(
        Math.max(0, inv.total - (credits.get(inv.number) ?? 0) - (paid.get(inv.number) ?? 0)),
      ),
      contactId: inv.contactId,
      dueDate: inv.dueDate,
    });
  }
  return out;
}

/** The digits of an invoice number, as banks write them: "INV-1061" in "DEPOSIT … INV 1061". */
function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

/** Invoices a deposit may pay: its number in the description first, then the same amount owed. */
export function suggestInvoices(
  ctx: ReadContext,
  description: string,
  amount: Cents,
): InvoiceSuggestion[] {
  if (amount <= 0) return [];
  const words = description
    .split(/\s+/)
    .map(digitsOf)
    .filter((d) => d.length >= 3);
  const out: InvoiceSuggestion[] = [];
  for (const [number, inv] of owingByNumber(ctx)) {
    if (inv.owing <= 0) continue;
    const byNumber = words.includes(digitsOf(number));
    const byAmount = inv.owing === amount;
    if (!byNumber && !byAmount) continue;
    out.push({
      number,
      customer: getContactById(ctx.db, inv.contactId)?.name ?? '',
      owing: inv.owing,
      because: byNumber ? 'number' : 'amount',
    });
  }
  return out.sort((a, b) =>
    a.because === b.because ? a.number.localeCompare(b.number) : a.because === 'number' ? -1 : 1,
  );
}

export type MatchFailure =
  PostFailure | 'not-a-deposit' | 'more-than-owed' | 'does-not-add-up' | 'no-invoice';

export interface MatchInput {
  readonly lineId: string;
  readonly invoices: readonly { readonly number: string; readonly amount: Cents }[];
  /** What is left of the deposit, to an account: overpaid, or something else in the same deposit. */
  readonly leftover: { readonly accountId: string; readonly taxCodeId: string | null } | null;
}

export function matchDeposit(
  ctx: ServiceContext,
  input: MatchInput,
): Result<{ entryId: string }, MatchFailure> {
  return ctx.db.transaction((): Result<{ entryId: string }, MatchFailure> => {
    const line = getReviewLine(ctx.db, input.lineId);
    if (line === null) return err('not-found');
    if (line.amount <= 0) return err('not-a-deposit');
    const receivables = accountForRole(ctx.db, 'receivables');
    if (receivables === null) return err('not-set-up');
    if (input.invoices.length === 0 || input.invoices.some((i) => i.amount <= 0))
      return err('no-invoice');
    const owing = owingByNumber(ctx);
    for (const i of input.invoices) {
      const inv = owing.get(i.number);
      if (inv === undefined) return err('no-invoice');
      if (i.amount > inv.owing) return err('more-than-owed');
    }
    const toInvoices = sumCents(input.invoices.map((i) => i.amount));
    const left = asCents(line.amount - toInvoices);
    if (left < 0 || (left > 0 && input.leftover === null)) return err('does-not-add-up');
    const contacts = new Set(input.invoices.map((i) => owing.get(i.number)?.contactId));
    const payeeId = contacts.size === 1 ? ([...contacts][0] ?? null) : null;
    const posted = postSplitLine(ctx, {
      lineId: input.lineId,
      payeeId,
      parts: [
        { accountId: receivables, taxCodeId: null, amount: toInvoices },
        ...(left > 0 && input.leftover !== null
          ? [
              {
                accountId: input.leftover.accountId,
                taxCodeId: input.leftover.taxCodeId,
                amount: left,
              },
            ]
          : []),
      ],
    });
    if (!posted.ok) return posted;
    for (const i of input.invoices) {
      const payment: PaymentRow = {
        id: newId('ipy', ctx.random),
        invoiceNumber: i.number,
        entryId: posted.value.entryId,
        amount: i.amount,
        date: line.date,
      };
      insertPayment(ctx.db, payment, ctx.clock.now());
      recordAudit(ctx, {
        kind: 'invoice.payment',
        table: 'invoice_payment',
        rowId: payment.id,
        before: null,
        after: payment,
      });
    }
    return ok({ entryId: posted.value.entryId });
  })();
}

/** `round(value × part ÷ whole)`, in whole cents, rounding halves away from zero. */
function share(value: number, part: number, whole: number): number {
  if (whole === 0) return 0;
  const exact = (value * part) / whole;
  return Math.sign(exact) * Math.round(Math.abs(exact));
}

/**
 * On the cash basis: the BAS lines a period's invoice payments bring in. Each payment carries its
 * share of the invoice's lines, net of credit notes for it; shares are worked out from what was
 * paid so far, so an invoice paid in full adds up to its lines exactly.
 */
export function paymentBasLines(
  ctx: ReadContext,
  from: CalendarDate,
  to: CalendarDate,
): ReportLine[] {
  const treatments = new Map(listTaxCodes(ctx.db).map((t) => [t.shortCode, t.treatment] as const));
  const all = listCurrentInvoices(ctx.db);
  const payments = listPayments(ctx.db);
  const out: ReportLine[] = [];
  for (const inv of all) {
    if (inv.kind !== 'invoice') continue;
    const mine = payments.filter((p) => p.invoiceNumber === inv.number);
    if (!mine.some((p) => compareDates(p.date, from) >= 0 && compareDates(p.date, to) <= 0))
      continue;
    // The invoice's lines by GST code, less its credit notes' lines.
    const byCode = new Map<string, { net: number; gst: number }>();
    const addLines = (invoiceId: string, sign: 1 | -1) => {
      for (const l of invoiceLines(ctx.db, invoiceId)) {
        const sum = byCode.get(l.gstCode) ?? { net: 0, gst: 0 };
        byCode.set(l.gstCode, {
          net: sum.net + sign * (l.total - l.gst),
          gst: sum.gst + sign * l.gst,
        });
      }
    };
    addLines(inv.id, 1);
    let whole = inv.total as number;
    for (const credit of all) {
      if (credit.kind === 'credit-note' && credit.creditFor === inv.number) {
        addLines(credit.id, -1);
        whole -= credit.total;
      }
    }
    let paidBefore = 0;
    for (const p of mine) {
      const paidAfter = paidBefore + p.amount;
      if (compareDates(p.date, from) >= 0 && compareDates(p.date, to) <= 0) {
        for (const [code, sum] of byCode) {
          const treatment: TaxTreatment | undefined = treatments.get(code);
          if (treatment === undefined) continue;
          const net = share(sum.net, paidAfter, whole) - share(sum.net, paidBefore, whole);
          const gst = share(sum.gst, paidAfter, whole) - share(sum.gst, paidBefore, whole);
          if (net === 0 && gst === 0) continue;
          out.push({
            entryId: p.entryId,
            sourceKind: 'bank-line',
            date: p.date,
            memo: `Payment for ${inv.number}`,
            payee: null,
            accountName: 'Sales',
            accountType: 'income',
            treatment,
            // Sales are credits: negative, as on the invoice.
            amount: asCents(-net),
            gst: asCents(-gst),
          });
        }
      }
      paidBefore = paidAfter;
    }
  }
  return out;
}
