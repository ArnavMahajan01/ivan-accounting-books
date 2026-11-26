// What the reports read (folder 08): the lines behind a figure, and the lines a BAS label is made
// from. Totals by account come from balance-queries.ts.

import { z } from 'zod';
import type { CalendarDate } from '@shared/dates';
import { TAX_TREATMENTS, ACCOUNT_TYPES, type AccountType, type TaxTreatment } from '@shared/kinds';
import type { Cents } from '@shared/money';
import type { Db } from './database';
import { calendarDateColumn, centsColumn } from './row-types';

export interface ReportLine {
  readonly entryId: string;
  readonly date: CalendarDate;
  readonly memo: string;
  readonly payee: string | null;
  readonly accountName: string;
  readonly accountType: AccountType;
  /** Null when the line has no GST code. */
  readonly treatment: TaxTreatment | null;
  /** Net of GST. Positive is a debit. */
  readonly amount: Cents;
  readonly gst: Cents;
}

const rowSchema = z.object({
  entry_id: z.string().regex(/^ent_/),
  entry_date: calendarDateColumn,
  memo: z.string(),
  payee: z.string().nullable(),
  account_name: z.string(),
  account_type: z.enum(ACCOUNT_TYPES),
  treatment: z.enum(TAX_TREATMENTS).nullable(),
  amount_cents: centsColumn,
  gst_cents: centsColumn,
});

const SELECT = `SELECT e.id AS entry_id, e.entry_date, e.memo,
    (SELECT c.name FROM journal_line p JOIN contact c ON c.id = p.payee_id
      WHERE p.entry_id = e.id AND p.payee_id IS NOT NULL ORDER BY p.position LIMIT 1) AS payee,
    a.name AS account_name, a.type AS account_type, t.treatment, l.amount_cents, l.gst_cents
  FROM journal_line l
  JOIN journal_entry e ON e.id = l.entry_id
  JOIN account a ON a.id = l.account_id
  LEFT JOIN tax_code t ON t.id = l.tax_code_id`;

function toLine(row: unknown): ReportLine {
  const r = rowSchema.parse(row);
  return {
    entryId: r.entry_id,
    date: r.entry_date,
    memo: r.memo,
    payee: r.payee,
    accountName: r.account_name,
    accountType: r.account_type,
    treatment: r.treatment,
    amount: r.amount_cents,
    gst: r.gst_cents,
  };
}

/** One account's lines between two days, both included. A null start is the start of the books. */
export function accountLines(
  db: Db,
  accountId: string,
  from: CalendarDate | null,
  to: CalendarDate,
): ReportLine[] {
  return db
    .prepare(
      `${SELECT} WHERE l.account_id = ? AND (? IS NULL OR e.entry_date >= ?) AND e.entry_date <= ?
       ORDER BY e.entry_date, e.rowid, l.position`,
    )
    .all(accountId, from, from, to)
    .map(toLine);
}

/** Every line with a GST code between two days: what the BAS labels are added up from. */
export function linesWithTaxCode(db: Db, from: CalendarDate, to: CalendarDate): ReportLine[] {
  return db
    .prepare(
      `${SELECT} WHERE l.tax_code_id IS NOT NULL AND e.entry_date BETWEEN ? AND ?
       ORDER BY e.entry_date, e.rowid, l.position`,
    )
    .all(from, to)
    .map(toLine);
}
