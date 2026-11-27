// The accountant's edits read back from the sheets (spec 116), checked with Zod when read back.

import { z } from 'zod';
import type { Db } from './database';
import { timestampColumn } from './row-types';

export const CHANGE_FIELDS = ['account', 'gst', 'note'] as const;
export type ChangeField = (typeof CHANGE_FIELDS)[number];
export type ChangeStatus = 'waiting' | 'accepted' | 'rejected' | 'withdrawn';

export interface AccountantChange {
  readonly id: string;
  readonly linkId: string;
  readonly rowKey: string;
  readonly sheetRow: number;
  readonly field: ChangeField;
  readonly oldValue: string;
  readonly newValue: string;
  readonly changedBy: string | null;
  readonly seenAt: string;
  readonly status: ChangeStatus;
  readonly decidedAt: string | null;
}

const rowSchema = z.object({
  id: z.string().regex(/^chg_/),
  sheet_link_id: z.string(),
  row_key: z.string(),
  sheet_row: z.number().int().positive(),
  field: z.enum(CHANGE_FIELDS),
  old_value: z.string(),
  new_value: z.string(),
  changed_by: z.string().nullable(),
  seen_at: timestampColumn,
  status: z.enum(['waiting', 'accepted', 'rejected', 'withdrawn']),
  decided_at: timestampColumn.nullable(),
});

const COLUMNS =
  'id, sheet_link_id, row_key, sheet_row, field, old_value, new_value, changed_by, seen_at, status, decided_at';

function toChange(row: unknown): AccountantChange {
  const r = rowSchema.parse(row);
  return {
    id: r.id,
    linkId: r.sheet_link_id,
    rowKey: r.row_key,
    sheetRow: r.sheet_row,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    changedBy: r.changed_by,
    seenAt: r.seen_at,
    status: r.status,
    decidedAt: r.decided_at,
  };
}

export function listChanges(db: Db, status: ChangeStatus | null): AccountantChange[] {
  return db
    .prepare(
      `SELECT ${COLUMNS} FROM accountant_change WHERE (@status IS NULL OR status = @status)
       ORDER BY COALESCE(decided_at, seen_at) DESC, sheet_row`,
    )
    .all({ status })
    .map(toChange);
}

export function changesForLink(db: Db, linkId: string): AccountantChange[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM accountant_change WHERE sheet_link_id = ? ORDER BY seen_at`)
    .all(linkId)
    .map(toChange);
}

export function getChange(db: Db, id: string): AccountantChange | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM accountant_change WHERE id = ?`).get(id);
  return row === undefined ? null : toChange(row);
}

export function countWaiting(db: Db): number {
  const row = z
    .object({ n: z.number().int() })
    .parse(
      db.prepare("SELECT COUNT(*) AS n FROM accountant_change WHERE status = 'waiting'").get(),
    );
  return row.n;
}

export function insertChange(db: Db, change: AccountantChange, at: string): void {
  db.prepare(
    `INSERT INTO accountant_change (${COLUMNS}, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    change.id,
    change.linkId,
    change.rowKey,
    change.sheetRow,
    change.field,
    change.oldValue,
    change.newValue,
    change.changedBy,
    change.seenAt,
    change.status,
    change.decidedAt,
    at,
    at,
  );
}

export function updateChange(db: Db, change: AccountantChange, at: string): void {
  db.prepare(
    `UPDATE accountant_change SET sheet_row = ?, new_value = ?, changed_by = ?, seen_at = ?, status = ?,
       decided_at = ?, updated_at = ? WHERE id = ?`,
  ).run(
    change.sheetRow,
    change.newValue,
    change.changedBy,
    change.seenAt,
    change.status,
    change.decidedAt,
    at,
    change.id,
  );
}

/** Drive's "modified" time when the sheet was last read. */
export function checkedTime(db: Db, linkId: string): string | null {
  const row = z
    .object({ checked_time: z.string().nullable() })
    .optional()
    .parse(db.prepare('SELECT checked_time FROM sheet_link WHERE id = ?').get(linkId));
  return row?.checked_time ?? null;
}

export function setCheckedTime(db: Db, linkId: string, time: string): void {
  db.prepare('UPDATE sheet_link SET checked_time = ? WHERE id = ?').run(time, linkId);
}
