// What To review reads and writes (folder 06): the lines waiting, what each posted line is linked
// to, the history suggestions learn from, entries a line may match, and the words that point to a
// contact. Writes here come only from the review services, inside the same transaction as the
// posting they record. The journal itself is written only by the posting service (invariant 3).

import { z } from 'zod';
import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { STATEMENT_LINE_STATUSES, type StatementLineStatus } from '@shared/kinds';
import type { Cents } from '@shared/money';
import type { Db } from './database';
import { calendarDateColumn, centsColumn, timestampColumn } from './row-types';

/** A bank line as To review needs it, with its bank account and what it is linked to. */
export interface ReviewLine {
  readonly id: Id<'stl'>;
  readonly bankAccountId: Id<'bnk'>;
  readonly batchId: Id<'imp'>;
  readonly bankAccountName: string;
  readonly bankLedgerAccountId: Id<'acc'>;
  readonly date: CalendarDate;
  readonly description: string;
  /** Money in is positive, money out negative. */
  readonly amount: Cents;
  readonly status: StatementLineStatus;
  readonly entryId: Id<'ent'> | null;
  readonly pairedLineId: Id<'stl'> | null;
}

const LINE_SELECT = `SELECT s.id, s.bank_account_id, s.batch_id, b.name AS bank_name, b.ledger_account_id,
    s.line_date, s.description, s.amount_cents, s.status, s.entry_id, s.paired_line_id
  FROM statement_line s JOIN bank_account b ON b.id = s.bank_account_id`;

const lineRow = z.object({
  id: z.string().regex(/^stl_/),
  bank_account_id: z.string().regex(/^bnk_/),
  batch_id: z.string().regex(/^imp_/),
  bank_name: z.string(),
  ledger_account_id: z.string().regex(/^acc_/),
  line_date: calendarDateColumn,
  description: z.string(),
  amount_cents: centsColumn,
  status: z.enum(STATEMENT_LINE_STATUSES),
  entry_id: z.string().regex(/^ent_/).nullable(),
  paired_line_id: z.string().regex(/^stl_/).nullable(),
});

function toReviewLine(row: unknown): ReviewLine {
  const r = lineRow.parse(row);
  return {
    id: r.id as Id<'stl'>,
    bankAccountId: r.bank_account_id as Id<'bnk'>,
    batchId: r.batch_id as Id<'imp'>,
    bankAccountName: r.bank_name,
    bankLedgerAccountId: r.ledger_account_id as Id<'acc'>,
    date: r.line_date,
    description: r.description,
    amount: r.amount_cents,
    status: r.status,
    entryId: r.entry_id as Id<'ent'> | null,
    pairedLineId: r.paired_line_id as Id<'stl'> | null,
  };
}

export function getReviewLine(db: Db, id: string): ReviewLine | null {
  const row = db.prepare(`${LINE_SELECT} WHERE s.id = ?`).get(id);
  return row === undefined ? null : toReviewLine(row);
}

/** Every line waiting for review, oldest first, in file order within a day. */
export function listWaitingLines(db: Db): ReviewLine[] {
  return db
    .prepare(`${LINE_SELECT} WHERE s.status = 'to-review' ORDER BY s.line_date, s.rowid`)
    .all()
    .map(toReviewLine);
}

/** Every imported line, oldest first: for testing a rule against them all (spec 080). */
export function listAllLines(db: Db): ReviewLine[] {
  return db.prepare(`${LINE_SELECT} ORDER BY s.line_date, s.rowid`).all().map(toReviewLine);
}

/** The lines posted with this entry: one, or two for a transfer posted as a pair. */
export function linesForEntry(db: Db, entryId: string): ReviewLine[] {
  return db
    .prepare(`${LINE_SELECT} WHERE s.entry_id = ? ORDER BY s.rowid`)
    .all(entryId)
    .map(toReviewLine);
}

/** A waiting line is posted (or matched) to an entry. Only a waiting line changes. */
export function markLinePosted(
  db: Db,
  lineId: string,
  entryId: string,
  pairedLineId: string | null,
): void {
  const changed = db
    .prepare(
      `UPDATE statement_line SET status = 'posted', entry_id = ?, paired_line_id = ?
       WHERE id = ? AND status = 'to-review'`,
    )
    .run(entryId, pairedLineId, lineId).changes;
  if (changed !== 1) throw new Error('Only a waiting line can be posted');
}

/** Puts a posted line back in To review, with no entry and no pair. */
export function markLineWaiting(db: Db, lineId: string): void {
  db.prepare(
    `UPDATE statement_line SET status = 'to-review', entry_id = NULL, paired_line_id = NULL
     WHERE id = ?`,
  ).run(lineId);
}

export function setPairedLine(db: Db, lineId: string, pairedLineId: string | null): void {
  db.prepare('UPDATE statement_line SET paired_line_id = ? WHERE id = ?').run(pairedLineId, lineId);
}

// ---- Transfers --------------------------------------------------------------------------------

/**
 * Posted lines still waiting for their other side: posted against the transfers clearing account,
 * and not yet paired (spec 073).
 */
export function listOpenTransferLines(db: Db, transfersAccountId: string): ReviewLine[] {
  return db
    .prepare(
      `${LINE_SELECT} WHERE s.status = 'posted' AND s.paired_line_id IS NULL
         AND EXISTS (SELECT 1 FROM journal_line j WHERE j.entry_id = s.entry_id AND j.account_id = ?)
       ORDER BY s.line_date, s.rowid`,
    )
    .all(transfersAccountId)
    .map(toReviewLine);
}

// ---- Suggestions ------------------------------------------------------------------------------

/** A posted bank line and the one other account its entry used, for suggestions (spec 074). */
export interface PostedLineHistory {
  readonly description: string;
  readonly amount: Cents;
  readonly date: CalendarDate;
  readonly accountId: string;
  readonly taxCodeId: string | null;
  readonly payeeId: string | null;
}

const historyRow = z.object({
  description: z.string(),
  amount_cents: centsColumn,
  line_date: calendarDateColumn,
  account_id: z.string().regex(/^acc_/),
  tax_code_id: z.string().regex(/^tax_/).nullable(),
  payee_id: z.string().nullable(),
});

/**
 * Posted lines whose entry has exactly one line besides the bank and GST: a split line or a
 * transfer says nothing simple about where a line like it should go, so it is left out.
 */
export function listPostedLineHistory(db: Db, gstAccountId: string | null): PostedLineHistory[] {
  return db
    .prepare(
      `SELECT s.description, s.amount_cents, s.line_date, j.account_id, j.tax_code_id, j.payee_id
       FROM statement_line s
       JOIN bank_account b ON b.id = s.bank_account_id
       JOIN journal_line j ON j.entry_id = s.entry_id
         AND j.account_id <> b.ledger_account_id AND j.account_id IS NOT ?
       WHERE s.status = 'posted'
         AND NOT EXISTS (SELECT 1 FROM bank_account other WHERE other.ledger_account_id = j.account_id)
         AND NOT EXISTS (SELECT 1 FROM account_role r WHERE r.account_id = j.account_id)
         AND (SELECT COUNT(*) FROM journal_line k WHERE k.entry_id = s.entry_id
               AND k.account_id <> b.ledger_account_id AND k.account_id IS NOT ?) = 1`,
    )
    .all(gstAccountId, gstAccountId)
    .map((row) => {
      const r = historyRow.parse(row);
      return {
        description: r.description,
        amount: r.amount_cents,
        date: r.line_date,
        accountId: r.account_id,
        taxCodeId: r.tax_code_id,
        payeeId: r.payee_id,
      };
    });
}

// ---- Entries a line may match (spec 069a) -----------------------------------------------------

export interface MatchableEntryRow {
  readonly id: Id<'ent'>;
  readonly date: CalendarDate;
  readonly memo: string;
  readonly ledgerAccountId: Id<'acc'>;
  /** What the entry did to that bank account. */
  readonly bankAmount: Cents;
  readonly payeeName: string | null;
}

const matchableRow = z.object({
  id: z.string().regex(/^ent_/),
  entry_date: calendarDateColumn,
  memo: z.string(),
  account_id: z.string().regex(/^acc_/),
  bank_amount: centsColumn,
  payee_name: z.string().nullable(),
});

/**
 * Entries that move money through one of his bank accounts between two days, and that no bank line
 * is linked to yet.
 */
export function listMatchableEntries(
  db: Db,
  from: CalendarDate,
  to: CalendarDate,
): MatchableEntryRow[] {
  return db
    .prepare(
      `SELECT e.id, e.entry_date, e.memo, j.account_id, SUM(j.amount_cents) AS bank_amount,
         (SELECT c.name FROM journal_line p JOIN contact c ON c.id = p.payee_id
          WHERE p.entry_id = e.id AND p.payee_id IS NOT NULL ORDER BY p.position LIMIT 1) AS payee_name
       FROM journal_entry e
       JOIN journal_line j ON j.entry_id = e.id
       JOIN bank_account b ON b.ledger_account_id = j.account_id
       WHERE e.entry_date BETWEEN ? AND ?
         AND NOT EXISTS (SELECT 1 FROM statement_line s WHERE s.entry_id = e.id)
       GROUP BY e.id, j.account_id
       ORDER BY e.entry_date, e.id`,
    )
    .all(from, to)
    .map((row) => {
      const r = matchableRow.parse(row);
      return {
        id: r.id as Id<'ent'>,
        date: r.entry_date,
        memo: r.memo,
        ledgerAccountId: r.account_id as Id<'acc'>,
        bankAmount: r.bank_amount,
        payeeName: r.payee_name,
      };
    });
}

/** Whether any bank line is linked to the entry. */
export function isEntryLinked(db: Db, entryId: string): boolean {
  return (
    db.prepare('SELECT 1 FROM statement_line WHERE entry_id = ? LIMIT 1').get(entryId) !== undefined
  );
}

// ---- Contact matches (spec 071) ---------------------------------------------------------------

export interface ContactMatchRow {
  readonly words: string;
  readonly contactId: Id<'con'>;
}

const matchRow = z.object({
  words: z.string().min(1),
  contact_id: z.string().regex(/^con_/),
  created_at: timestampColumn,
});

export function listContactMatches(db: Db): ContactMatchRow[] {
  return db
    .prepare('SELECT words, contact_id, created_at FROM contact_match ORDER BY words')
    .all()
    .map((row) => {
      const r = matchRow.parse(row);
      return { words: r.words, contactId: r.contact_id as Id<'con'> };
    });
}

/** Points the words at the contact, replacing any contact they pointed at before. */
export function saveContactMatch(db: Db, words: string, contactId: string, at: string): void {
  db.prepare(
    `INSERT INTO contact_match (words, contact_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT (words) DO UPDATE SET contact_id = excluded.contact_id, created_at = excluded.created_at`,
  ).run(words, contactId, at);
}

export function getContactMatch(db: Db, words: string): ContactMatchRow | null {
  const row = db
    .prepare('SELECT words, contact_id, created_at FROM contact_match WHERE words = ?')
    .get(words);
  if (row === undefined) return null;
  const r = matchRow.parse(row);
  return { words: r.words, contactId: r.contact_id as Id<'con'> };
}

export function deleteContactMatch(db: Db, words: string): void {
  db.prepare('DELETE FROM contact_match WHERE words = ?').run(words);
}

/** Removes a contact and every match pointing at it. Callers check it is not used first. */
export function deleteContactWithMatches(db: Db, contactId: string): void {
  db.prepare('DELETE FROM contact_match WHERE contact_id = ?').run(contactId);
  db.prepare('DELETE FROM contact WHERE id = ?').run(contactId);
}

/** How many journal lines name the contact as payee. */
export function countLinesWithPayee(db: Db, contactId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM journal_line WHERE payee_id = ?')
    .get(contactId) as { n: number };
  return row.n;
}
