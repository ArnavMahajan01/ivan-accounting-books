// The lines a BAS period is added up from (specs 094, 126, 129). On the accrual basis, every line
// with a GST code dated in the period. On the cash basis (client question 3's assumption), GST is
// reported when money moves: an invoice from the Admin Dashboard (posted to accounts receivable)
// is left out on its own date, and counts when it is paid (spec 129).

import { getBusiness } from '@data/business-repository';
import { invoiceEntryIds } from '@data/invoice-repository';
import { linesWithTaxCode, type ReportLine } from '@data/report-queries';
import type { CalendarDate } from '@shared/dates';
import type { ReadContext } from './context';

export function basLines(ctx: ReadContext, from: CalendarDate, to: CalendarDate): ReportLine[] {
  const lines = linesWithTaxCode(ctx.db, from, to);
  const cash = (getBusiness(ctx.db)?.gstBasis ?? 'cash') === 'cash';
  if (!cash) return lines;
  // Only invoices posted to accounts receivable wait: a sale paid straight into the bank is cash.
  const onCredit = invoiceEntryIds(ctx.db);
  return lines.filter((l) => !onCredit.has(l.entryId));
}
