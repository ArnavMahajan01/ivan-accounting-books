// His saved reports (spec 101): a name and a report request, checked with Zod when read back.

import { z } from 'zod';
import { reportRequestSchema } from '@shared/report-request-schema';
import type { ReportRequest } from '@shared/reports';
import type { Db } from './database';
import { timestampColumn } from './row-types';

export interface ReportLayout {
  readonly id: string;
  readonly name: string;
  readonly request: ReportRequest;
}

const rowSchema = z.object({
  id: z.string().regex(/^lay_/),
  name: z.string(),
  request: z.string(),
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

function toLayout(row: unknown): ReportLayout {
  const r = rowSchema.parse(row);
  return { id: r.id, name: r.name, request: reportRequestSchema.parse(JSON.parse(r.request)) };
}

export function listLayouts(db: Db): ReportLayout[] {
  return db
    .prepare('SELECT id, name, request, created_at, updated_at FROM report_layout ORDER BY name')
    .all()
    .map(toLayout);
}

export function getLayout(db: Db, id: string): ReportLayout | null {
  const row = db
    .prepare('SELECT id, name, request, created_at, updated_at FROM report_layout WHERE id = ?')
    .get(id);
  return row === undefined ? null : toLayout(row);
}

export function getLayoutByName(db: Db, name: string): ReportLayout | null {
  const row = db
    .prepare('SELECT id, name, request, created_at, updated_at FROM report_layout WHERE name = ?')
    .get(name);
  return row === undefined ? null : toLayout(row);
}

export function insertLayout(db: Db, layout: ReportLayout, at: string): void {
  db.prepare(
    'INSERT INTO report_layout (id, name, request, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(layout.id, layout.name, JSON.stringify(layout.request), at, at);
}

export function updateLayout(db: Db, layout: ReportLayout, at: string): void {
  db.prepare('UPDATE report_layout SET name = ?, request = ?, updated_at = ? WHERE id = ?').run(
    layout.name,
    JSON.stringify(layout.request),
    at,
    layout.id,
  );
}

export function deleteLayout(db: Db, id: string): void {
  db.prepare('DELETE FROM report_layout WHERE id = ?').run(id);
}
