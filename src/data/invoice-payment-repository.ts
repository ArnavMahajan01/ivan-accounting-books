// Payments matched to invoices (spec 129), checked with Zod when read back.

import { z } from 'zod';
import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { Db } from './database';
import { calendarDateColumn, centsColumn } from './row-types';

export interface PaymentRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly entryId: string;
  readonly amount: Cents;
  readonly date: CalendarDate;
}

const rowSchema = z.object({
  id: z.string().regex(/^ipy_/),
  invoice_number: z.string(),
  entry_id: z.string(),
  amount_cents: centsColumn,
  paid_date: calendarDateColumn,
});

const toPayment = (row: unknown): PaymentRow => {
  const r = rowSchema.parse(row);
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    entryId: r.entry_id,
    amount: r.amount_cents,
    date: r.paid_date,
  };
};

const COLUMNS = 'id, invoice_number, entry_id, amount_cents, paid_date';

export function listPayments(db: Db): PaymentRow[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM invoice_payment ORDER BY paid_date, rowid`)
    .all()
    .map(toPayment);
}

export function insertPayment(db: Db, payment: PaymentRow, at: string): void {
  db.prepare(`INSERT INTO invoice_payment (${COLUMNS}, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    payment.id,
    payment.invoiceNumber,
    payment.entryId,
    payment.amount,
    payment.date,
    at,
  );
}

/** Undoing the post that made them (To review's Undo) removes them too. */
export function deletePaymentsForEntry(db: Db, entryId: string): void {
  db.prepare('DELETE FROM invoice_payment WHERE entry_id = ?').run(entryId);
}
