// Reads of the books. Only reads: the writes are in journal-writes.ts, which only the posting
// service imports (spec 041).

import { z } from 'zod';
import type { JournalEntry, JournalLine } from '@domain/journal';
import type { Id } from '@shared/ids';
import { ENTRY_SOURCE_KINDS } from '@shared/kinds';
import type { Db } from './database';
import { calendarDateColumn, centsColumn, timestampColumn } from './row-types';

const entrySchema = z.object({
  id: z.string().regex(/^ent_/),
  entry_date: calendarDateColumn,
  memo: z.string(),
  source_kind: z.enum(ENTRY_SOURCE_KINDS),
  source_id: z.string().nullable(),
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

const lineSchema = z.object({
  id: z.string().regex(/^lin_/),
  account_id: z.string().regex(/^acc_/),
  amount_cents: centsColumn,
  tax_code_id: z.string().regex(/^tax_/).nullable(),
  gst_cents: centsColumn,
  payee_id: z.string().nullable(),
  memo: z.string(),
});

function readLines(db: Db, entryId: string): JournalLine[] {
  const rows = db
    .prepare(
      `SELECT id, account_id, amount_cents, tax_code_id, gst_cents, payee_id, memo
       FROM journal_line WHERE entry_id = ? ORDER BY position`,
    )
    .all(entryId);
  return rows.map((row) => {
    const r = lineSchema.parse(row);
    return {
      id: r.id as Id<'lin'>,
      accountId: r.account_id as Id<'acc'>,
      amount: r.amount_cents,
      taxCodeId: r.tax_code_id as Id<'tax'> | null,
      gst: r.gst_cents,
      payeeId: r.payee_id,
      memo: r.memo,
    };
  });
}

/** An entry with its lines, or null if there is none with that id. */
export function getJournalEntry(db: Db, id: string): JournalEntry | null {
  const row = db
    .prepare(
      'SELECT id, entry_date, memo, source_kind, source_id, created_at, updated_at FROM journal_entry WHERE id = ?',
    )
    .get(id);
  if (row === undefined) return null;
  const r = entrySchema.parse(row);
  return {
    id: r.id as Id<'ent'>,
    date: r.entry_date,
    memo: r.memo,
    sourceKind: r.source_kind,
    sourceId: r.source_id,
    lines: readLines(db, r.id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** What one entry's lines add up to. Zero for every entry the posting service has written. */
export function entryLineTotal(db: Db, entryId: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount_cents), 0) AS total FROM journal_line WHERE entry_id = ?')
    .get(entryId) as { total: number };
  return row.total;
}

export function countJournalEntries(db: Db): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM journal_entry').get() as { n: number }).n;
}

export function countJournalLines(db: Db): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM journal_line').get() as { n: number }).n;
}

/** How many entries have lines that do not sum to zero. Always zero unless something outside the posting service wrote. */
export function countUnbalancedEntries(db: Db): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT entry_id FROM journal_line GROUP BY entry_id HAVING SUM(amount_cents) <> 0
       )`,
    )
    .get() as { n: number };
  return row.n;
}

/** The entries with a line naming the contact as payee, oldest first (spec 124). */
export function entryIdsWithPayee(db: Db, contactId: string): string[] {
  return db
    .prepare(
      `SELECT DISTINCT e.id FROM journal_entry e JOIN journal_line l ON l.entry_id = e.id
       WHERE l.payee_id = ? ORDER BY e.entry_date, e.rowid`,
    )
    .all(contactId)
    .map((row) => z.object({ id: z.string() }).parse(row).id);
}
