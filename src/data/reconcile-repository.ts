// Reconciliations (spec 085): each records that the books held a statement's balance for a bank
// account on a day, and the bank lines it covered point to it.

import { z } from 'zod';
import type { CalendarDate, Timestamp } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { Db } from './database';
import { calendarDateColumn } from './row-types';

export interface Reconciliation {
  readonly id: string;
  readonly bankAccountId: string;
  readonly statementDate: CalendarDate;
  readonly statementBalance: Cents;
  readonly booksBalance: Cents;
  readonly doneAt: Timestamp;
}

export function insertReconciliation(db: Db, r: Reconciliation): void {
  db.prepare(
    `INSERT INTO reconciliation (id, bank_account_id, statement_date, statement_balance_cents,
       books_balance_cents, difference_cents, done_at) VALUES (?, ?, ?, ?, ?, 0, ?)`,
  ).run(r.id, r.bankAccountId, r.statementDate, r.statementBalance, r.booksBalance, r.doneAt);
}

/** The latest day the account was reconciled to, or null. */
export function lastReconciledDate(db: Db, bankAccountId: string): CalendarDate | null {
  const row = db
    .prepare('SELECT MAX(statement_date) AS d FROM reconciliation WHERE bank_account_id = ?')
    .get(bankAccountId) as { d: string | null };
  return row.d === null ? null : calendarDateColumn.parse(row.d);
}

/** Marks the account's posted lines on or before the day, not yet reconciled, as covered. */
export function markLinesReconciled(
  db: Db,
  bankAccountId: string,
  to: CalendarDate,
  reconciliationId: string,
): number {
  return db
    .prepare(
      `UPDATE statement_line SET reconciliation_id = ?
       WHERE bank_account_id = ? AND line_date <= ? AND status = 'posted' AND reconciliation_id IS NULL`,
    )
    .run(reconciliationId, bankAccountId, to).changes;
}

/** Which of these lines a reconciliation covers. */
export function reconciledLineIds(db: Db, lineIds: readonly string[]): Set<string> {
  const rows = db
    .prepare(
      `SELECT id FROM statement_line WHERE reconciliation_id IS NOT NULL
       AND id IN (SELECT value FROM json_each(?))`,
    )
    .all(JSON.stringify(lineIds));
  return new Set(rows.map((r) => z.object({ id: z.string() }).parse(r).id));
}
