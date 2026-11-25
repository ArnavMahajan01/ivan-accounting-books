// Imported bank lines and the files they came from. Writes here come only from the import commit
// service (spec 063). The unique key on (bank account, line key) is the last line of defence
// against a line being stored twice (risk L3).

import { z } from 'zod';
import type { ImportBatch, StatementLine } from '@domain/statement-lines';
import type { CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { Id } from '@shared/ids';
import { IMPORT_FORMATS, STATEMENT_LINE_STATUSES, type StatementLineStatus } from '@shared/kinds';
import type { Db } from './database';
import { calendarDateColumn, centsColumn, timestampColumn } from './row-types';

const BATCH_COLUMNS = `id, bank_account_id, file_name, format, file_hash, period_from, period_to,
  new_count, duplicate_count, rejected_count, opening_balance_cents, closing_balance_cents,
  closing_balance_date, imported_at`;
const LINE_COLUMNS =
  'id, bank_account_id, batch_id, line_date, description, amount_cents, balance_cents, line_key, status, created_at';

const batchRow = z.object({
  id: z.string().regex(/^imp_/),
  bank_account_id: z.string().regex(/^bnk_/),
  file_name: z.string(),
  format: z.enum(IMPORT_FORMATS),
  file_hash: z.string().regex(/^[0-9a-f]{64}$/),
  period_from: calendarDateColumn,
  period_to: calendarDateColumn,
  new_count: z.number().int().min(0),
  duplicate_count: z.number().int().min(0),
  rejected_count: z.number().int().min(0),
  opening_balance_cents: centsColumn.nullable(),
  closing_balance_cents: centsColumn.nullable(),
  closing_balance_date: calendarDateColumn.nullable(),
  imported_at: timestampColumn,
});

const lineRow = z.object({
  id: z.string().regex(/^stl_/),
  bank_account_id: z.string().regex(/^bnk_/),
  batch_id: z.string().regex(/^imp_/),
  line_date: calendarDateColumn,
  description: z.string(),
  amount_cents: centsColumn,
  balance_cents: centsColumn.nullable(),
  line_key: z.string().min(1),
  status: z.enum(STATEMENT_LINE_STATUSES),
  created_at: timestampColumn,
});

function toBatch(row: unknown): ImportBatch {
  const r = batchRow.parse(row);
  return {
    id: r.id as Id<'imp'>,
    bankAccountId: r.bank_account_id as Id<'bnk'>,
    fileName: r.file_name,
    format: r.format,
    fileHash: r.file_hash,
    periodFrom: r.period_from,
    periodTo: r.period_to,
    newCount: r.new_count,
    duplicateCount: r.duplicate_count,
    rejectedCount: r.rejected_count,
    openingBalance: r.opening_balance_cents,
    closingBalance:
      r.closing_balance_cents === null || r.closing_balance_date === null
        ? null
        : { amount: r.closing_balance_cents, date: r.closing_balance_date },
    importedAt: r.imported_at,
  };
}

function toLine(row: unknown): StatementLine {
  const r = lineRow.parse(row);
  return {
    id: r.id as Id<'stl'>,
    bankAccountId: r.bank_account_id as Id<'bnk'>,
    batchId: r.batch_id as Id<'imp'>,
    date: r.line_date,
    description: r.description,
    amount: r.amount_cents,
    balance: r.balance_cents,
    key: r.line_key,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function insertImportBatch(db: Db, batch: ImportBatch): void {
  db.prepare(
    `INSERT INTO import_batch (${BATCH_COLUMNS})
     VALUES (@id, @bankAccountId, @fileName, @format, @fileHash, @periodFrom, @periodTo,
       @newCount, @duplicateCount, @rejectedCount, @openingCents, @closingCents, @closingDate,
       @importedAt)`,
  ).run({
    id: batch.id,
    bankAccountId: batch.bankAccountId,
    fileName: batch.fileName,
    format: batch.format,
    fileHash: batch.fileHash,
    periodFrom: batch.periodFrom,
    periodTo: batch.periodTo,
    newCount: batch.newCount,
    duplicateCount: batch.duplicateCount,
    rejectedCount: batch.rejectedCount,
    openingCents: batch.openingBalance,
    closingCents: batch.closingBalance?.amount ?? null,
    closingDate: batch.closingBalance?.date ?? null,
    importedAt: batch.importedAt,
  });
}

/** Throws if the line's key is already stored for that account: callers check first. */
export function insertStatementLine(db: Db, line: StatementLine): void {
  db.prepare(
    `INSERT INTO statement_line (${LINE_COLUMNS})
     VALUES (@id, @bankAccountId, @batchId, @date, @description, @amount, @balance, @key, @status, @createdAt)`,
  ).run({
    id: line.id,
    bankAccountId: line.bankAccountId,
    batchId: line.batchId,
    date: line.date,
    description: line.description,
    amount: line.amount,
    balance: line.balance,
    key: line.key,
    status: line.status,
    createdAt: line.createdAt,
  });
}

/** Which of these keys are already stored for the account. */
export function existingLineKeys(
  db: Db,
  bankAccountId: string,
  keys: readonly string[],
): Set<string> {
  const rows = db
    .prepare(
      `SELECT line_key FROM statement_line
       WHERE bank_account_id = ? AND line_key IN (SELECT value FROM json_each(?))`,
    )
    .all(bankAccountId, JSON.stringify(keys));
  return new Set(rows.map((row) => z.object({ line_key: z.string() }).parse(row).line_key));
}

export function listLinesInBatch(db: Db, batchId: string): StatementLine[] {
  return db
    .prepare(`SELECT ${LINE_COLUMNS} FROM statement_line WHERE batch_id = ? ORDER BY rowid`)
    .all(batchId)
    .map(toLine);
}

export function countLinesByStatus(db: Db, status: StatementLineStatus): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM statement_line WHERE status = ?')
    .get(status) as { n: number };
  return row.n;
}

/** The files imported so far, newest first. */
export function listImportBatches(db: Db, limit: number): ImportBatch[] {
  return db
    .prepare(
      `SELECT ${BATCH_COLUMNS} FROM import_batch ORDER BY imported_at DESC, rowid DESC LIMIT ?`,
    )
    .all(limit)
    .map(toBatch);
}

/**
 * The batch that ends latest for the account, which carries the last statement balance. A tie goes
 * to the one imported last.
 */
export function latestBatchForAccount(db: Db, bankAccountId: string): ImportBatch | null {
  const row = db
    .prepare(
      `SELECT ${BATCH_COLUMNS} FROM import_batch WHERE bank_account_id = ?
       ORDER BY period_to DESC, imported_at DESC, rowid DESC LIMIT 1`,
    )
    .get(bankAccountId);
  return row === undefined ? null : toBatch(row);
}

/**
 * What the account held before its earliest imported file, and the day that file starts, which is
 * where every later file's check starts from. Null when no file has said.
 */
export function streamStart(
  db: Db,
  bankAccountId: string,
): { readonly opening: Cents; readonly from: CalendarDate } | null {
  const row = db
    .prepare(
      `SELECT opening_balance_cents AS opening, period_from AS from_date FROM import_batch
       WHERE bank_account_id = ? AND opening_balance_cents IS NOT NULL
       ORDER BY period_from ASC, imported_at ASC, rowid ASC LIMIT 1`,
    )
    .get(bankAccountId) as { opening: number; from_date: string } | undefined;
  return row === undefined
    ? null
    : { opening: centsColumn.parse(row.opening), from: calendarDateColumn.parse(row.from_date) };
}

/** Every imported line of the account, whatever its status, added up as at a date. */
export function sumLinesUpTo(db: Db, bankAccountId: string, to: CalendarDate): Cents {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM statement_line
       WHERE bank_account_id = ? AND line_date <= ?`,
    )
    .get(bankAccountId, to) as { total: number };
  return centsColumn.parse(row.total);
}

export function getImportBatch(db: Db, id: string): ImportBatch | null {
  const row = db.prepare(`SELECT ${BATCH_COLUMNS} FROM import_batch WHERE id = ?`).get(id);
  return row === undefined ? null : toBatch(row);
}

/** The file imported last for the account, which is the one that can be taken back. */
export function lastImportedBatch(db: Db, bankAccountId: string): ImportBatch | null {
  const row = db
    .prepare(
      `SELECT ${BATCH_COLUMNS} FROM import_batch WHERE bank_account_id = ?
       ORDER BY imported_at DESC, rowid DESC LIMIT 1`,
    )
    .get(bankAccountId);
  return row === undefined ? null : toBatch(row);
}

/** How many of a batch's lines have moved on from waiting for review (posted or excluded). */
export function countUsedLinesInBatch(db: Db, batchId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM statement_line WHERE batch_id = ? AND status <> 'to-review'`,
    )
    .get(batchId) as { n: number };
  return row.n;
}

/** Removes a batch and every line it added, and says how many lines went. */
export function deleteBatchWithLines(db: Db, batchId: string): number {
  const removed = db.prepare('DELETE FROM statement_line WHERE batch_id = ?').run(batchId).changes;
  db.prepare('DELETE FROM import_batch WHERE id = ?').run(batchId);
  return removed;
}

/** How many lines wait for review, for each bank account that has any. */
export function countLinesToReviewByAccount(db: Db): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT bank_account_id AS account_id, COUNT(*) AS n FROM statement_line
       WHERE status = 'to-review' GROUP BY bank_account_id`,
    )
    .all();
  return new Map(
    rows.map((row) => {
      const r = z.object({ account_id: z.string(), n: z.number().int() }).parse(row);
      return [r.account_id, r.n];
    }),
  );
}

/** How many lines wait for review, and the date of the oldest. */
export function summariseLinesToReview(db: Db): { count: number; oldest: CalendarDate | null } {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n, MIN(line_date) AS oldest FROM statement_line WHERE status = 'to-review'`,
    )
    .get() as { n: number; oldest: string | null };
  return {
    count: row.n,
    oldest: row.oldest === null ? null : calendarDateColumn.parse(row.oldest),
  };
}
