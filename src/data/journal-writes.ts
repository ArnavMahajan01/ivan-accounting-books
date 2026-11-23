// The only SQL that writes the journal tables. Only `src/services/post-journal.ts` imports it,
// and two tests in tools/ keep it that way (spec 041, invariant 3). Everything here is called
// inside the posting service's transaction, next to the audit log row that records the change.

import type { JournalEntry, JournalLine } from '@domain/journal';
import type { Db } from './database';

export function insertJournalEntry(db: Db, entry: JournalEntry): void {
  db.prepare(
    `INSERT INTO journal_entry (id, entry_date, memo, source_kind, source_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.id,
    entry.date,
    entry.memo,
    entry.sourceKind,
    entry.sourceId,
    entry.createdAt,
    entry.updatedAt,
  );
}

export function insertJournalLine(
  db: Db,
  entryId: string,
  position: number,
  line: JournalLine,
): void {
  db.prepare(
    `INSERT INTO journal_line
       (id, entry_id, position, account_id, amount_cents, tax_code_id, gst_cents, payee_id, memo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    line.id,
    entryId,
    position,
    line.accountId,
    line.amount,
    line.taxCodeId,
    line.gst,
    line.payeeId,
    line.memo,
  );
}

/** Saves a changed entry's own fields. Its lines are replaced with `deleteJournalLines` and `insertJournalLine`. */
export function updateJournalEntry(db: Db, entry: JournalEntry): void {
  db.prepare(
    `UPDATE journal_entry
     SET entry_date = ?, memo = ?, source_kind = ?, source_id = ?, updated_at = ?
     WHERE id = ?`,
  ).run(entry.date, entry.memo, entry.sourceKind, entry.sourceId, entry.updatedAt, entry.id);
}

export function deleteJournalLines(db: Db, entryId: string): void {
  db.prepare('DELETE FROM journal_line WHERE entry_id = ?').run(entryId);
}

/** Removes an entry. Its lines must already be gone. */
export function deleteJournalEntry(db: Db, entryId: string): void {
  db.prepare('DELETE FROM journal_entry WHERE id = ?').run(entryId);
}
