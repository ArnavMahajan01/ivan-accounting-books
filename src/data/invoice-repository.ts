// Invoices and credit notes from the Admin Dashboard (spec 126), checked with Zod when read back.

import { z } from 'zod';
import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { Db } from './database';
import { calendarDateColumn, centsColumn } from './row-types';

export interface InvoiceRow {
  readonly id: string;
  readonly kind: 'invoice' | 'credit-note';
  readonly number: string;
  readonly version: number;
  readonly contactId: string;
  readonly issueDate: CalendarDate;
  readonly dueDate: CalendarDate | null;
  /** GST-inclusive, positive for an invoice and a credit note alike. */
  readonly total: Cents;
  readonly gst: Cents;
  readonly creditFor: string | null;
  readonly pdf: string | null;
  readonly status: 'current' | 'replaced';
  readonly entryId: string | null;
  readonly sourceHash: string;
}

export interface InvoiceLineRow {
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: Cents;
  readonly gstCode: string;
  readonly total: Cents;
  readonly gst: Cents;
}

const rowSchema = z.object({
  id: z.string().regex(/^inv_/),
  kind: z.enum(['invoice', 'credit-note']),
  number: z.string(),
  version: z.number().int().positive(),
  contact_id: z.string(),
  issue_date: calendarDateColumn,
  due_date: calendarDateColumn.nullable(),
  total_cents: centsColumn,
  gst_cents: centsColumn,
  credit_for: z.string().nullable(),
  pdf: z.string().nullable(),
  status: z.enum(['current', 'replaced']),
  entry_id: z.string().nullable(),
  source_hash: z.string(),
});

const COLUMNS =
  'id, kind, number, version, contact_id, issue_date, due_date, total_cents, gst_cents, credit_for, pdf, status, entry_id, source_hash';

function toInvoice(row: unknown): InvoiceRow {
  const r = rowSchema.parse(row);
  return {
    id: r.id,
    kind: r.kind,
    number: r.number,
    version: r.version,
    contactId: r.contact_id,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    total: r.total_cents,
    gst: r.gst_cents,
    creditFor: r.credit_for,
    pdf: r.pdf,
    status: r.status,
    entryId: r.entry_id,
    sourceHash: r.source_hash,
  };
}

/** The current version of an invoice or credit note, by its number. */
export function currentInvoice(db: Db, number: string): InvoiceRow | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM invoice WHERE number = ? AND status = 'current'`)
    .get(number);
  return row === undefined ? null : toInvoice(row);
}

export function getInvoice(db: Db, id: string): InvoiceRow | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM invoice WHERE id = ?`).get(id);
  return row === undefined ? null : toInvoice(row);
}

/** Every current invoice and credit note, newest first; or one contact's. */
export function listCurrentInvoices(db: Db, contactId: string | null = null): InvoiceRow[] {
  return db
    .prepare(
      `SELECT ${COLUMNS} FROM invoice WHERE status = 'current' AND (? IS NULL OR contact_id = ?)
       ORDER BY issue_date DESC, number DESC`,
    )
    .all(contactId, contactId)
    .map(toInvoice);
}

export function insertInvoice(
  db: Db,
  invoice: InvoiceRow,
  lines: readonly (InvoiceLineRow & { readonly id: string })[],
  at: string,
): void {
  db.prepare(
    `INSERT INTO invoice (${COLUMNS}, created_at, updated_at) VALUES (${Array(16).fill('?').join(', ')})`,
  ).run(
    invoice.id,
    invoice.kind,
    invoice.number,
    invoice.version,
    invoice.contactId,
    invoice.issueDate,
    invoice.dueDate,
    invoice.total,
    invoice.gst,
    invoice.creditFor,
    invoice.pdf,
    invoice.status,
    invoice.entryId,
    invoice.sourceHash,
    at,
    at,
  );
  const insertLine = db.prepare(
    `INSERT INTO invoice_line (id, invoice_id, position, description, quantity, unit_price_cents, gst_code, total_cents, gst_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  lines.forEach((l, position) => {
    insertLine.run(
      l.id,
      invoice.id,
      position,
      l.description,
      l.quantity,
      l.unitPrice,
      l.gstCode,
      l.total,
      l.gst,
    );
  });
}

export function markReplaced(db: Db, id: string, at: string): void {
  db.prepare("UPDATE invoice SET status = 'replaced', updated_at = ? WHERE id = ?").run(at, id);
}

export function invoiceLines(db: Db, invoiceId: string): InvoiceLineRow[] {
  return db
    .prepare(
      `SELECT description, quantity, unit_price_cents, gst_code, total_cents, gst_cents
       FROM invoice_line WHERE invoice_id = ? ORDER BY position`,
    )
    .all(invoiceId)
    .map((row) => {
      const r = z
        .object({
          description: z.string(),
          quantity: z.string(),
          unit_price_cents: centsColumn,
          gst_code: z.string(),
          total_cents: centsColumn,
          gst_cents: centsColumn,
        })
        .parse(row);
      return {
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unit_price_cents,
        gstCode: r.gst_code,
        total: r.total_cents,
        gst: r.gst_cents,
      };
    });
}

/** The journal entries of every invoice and credit note posted from the Admin Dashboard. */
export function invoiceEntryIds(db: Db): Set<string> {
  return new Set(
    db
      .prepare('SELECT entry_id FROM invoice WHERE entry_id IS NOT NULL')
      .all()
      .map((row) => z.object({ entry_id: z.string() }).parse(row).entry_id),
  );
}
