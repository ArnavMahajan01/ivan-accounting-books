// The audit log is append-only: this file has an insert and a read, and nothing else touches the
// table. A test searches the source to keep it that way (tools/audit-append-only.test.ts).

import { z } from 'zod';
import type { AuditRecord } from '@domain/audit';
import type { Id } from '@shared/ids';
import { AUDIT_KINDS } from '@shared/kinds';
import type { Db } from './database';
import { timestampColumn } from './row-types';

const rowSchema = z.object({
  id: z.string().regex(/^aud_/),
  changed_at: timestampColumn,
  kind: z.enum(AUDIT_KINDS),
  table_name: z.string(),
  row_id: z.string(),
  before_json: z.string().nullable(),
  after_json: z.string().nullable(),
});

function toJson(value: unknown): string | null {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

function fromJson(text: string | null): unknown {
  return text === null ? null : (JSON.parse(text) as unknown);
}

export function appendAudit(db: Db, record: AuditRecord): void {
  db.prepare(
    `INSERT INTO audit_log (id, changed_at, kind, table_name, row_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    record.id,
    record.changedAt,
    record.kind,
    record.table,
    record.rowId,
    toJson(record.before),
    toJson(record.after),
  );
}

/** Oldest first. With a table and a row id, only that row's history. */
export function listAudit(db: Db, filter: { table?: string; rowId?: string } = {}): AuditRecord[] {
  const rows = db
    .prepare(
      `SELECT id, changed_at, kind, table_name, row_id, before_json, after_json FROM audit_log
       WHERE (@table IS NULL OR table_name = @table) AND (@rowId IS NULL OR row_id = @rowId)
       ORDER BY rowid`,
    )
    .all({ table: filter.table ?? null, rowId: filter.rowId ?? null });
  return rows.map((row) => {
    const r = rowSchema.parse(row);
    return {
      id: r.id as Id<'aud'>,
      changedAt: r.changed_at,
      kind: r.kind,
      table: r.table_name,
      rowId: r.row_id,
      before: fromJson(r.before_json),
      after: fromJson(r.after_json),
    };
  });
}

export function countAudit(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get() as { n: number };
  return row.n;
}
