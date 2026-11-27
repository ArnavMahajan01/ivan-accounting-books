// The published workbooks (spec 110), checked with Zod when read back. No rules here: the services
// decide when a link is made or changed, and write its audit row.

import { z } from 'zod';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { PublishedRequest, WorkbookKind } from '@shared/sheets';
import { publishedRequestSchema, WORKBOOK_KINDS } from '@shared/sheets';
import type { Db } from './database';
import { timestampColumn } from './row-types';

export interface SheetLink {
  readonly id: string;
  readonly fileId: string;
  readonly kind: WorkbookKind;
  readonly title: string;
  readonly request: PublishedRequest;
  /** Null for a report as at one day. */
  readonly from: CalendarDate | null;
  readonly to: CalendarDate;
  /** Null until the first write to Google finished. */
  readonly publishedAt: string | null;
  readonly publishedHash: string | null;
  /** How many rows each app tab had, by tab key. */
  readonly tabRows: Readonly<Record<string, number>>;
  /** By row key (an account, a BAS label, an entry id): what each row was when published. */
  readonly publishedValues: Readonly<Record<string, PublishedRow>>;
  readonly status: 'ok' | 'missing';
  /** His own tabs at the last publish. */
  readonly keptTabs: readonly string[];
}

/** What the columns he may change held when published (Transactions only). */
export interface PublishedEditable {
  readonly account: string;
  readonly gst: string;
  readonly note: string;
}

export interface PublishedRow {
  /** A short fingerprint of the whole row, to count what changed since last time. */
  readonly hash: string;
  readonly editable: PublishedEditable | null;
}

const publishedRowSchema = z.object({
  hash: z.string(),
  editable: z.object({ account: z.string(), gst: z.string(), note: z.string() }).nullable(),
});

const day = z.string().transform((text, ctx): CalendarDate => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) {
    ctx.addIssue({ code: 'custom', message: 'not a date' });
    return z.NEVER;
  }
  return parsed.value;
});

const rowSchema = z.object({
  id: z.string().regex(/^shl_/),
  file_id: z.string().min(1),
  kind: z.enum(WORKBOOK_KINDS),
  title: z.string(),
  request: z.string(),
  period_from: z.union([z.literal(''), day]),
  period_to: day,
  published_at: timestampColumn.nullable(),
  published_hash: z.string().nullable(),
  tab_rows: z.string(),
  published_values: z.string(),
  kept_tabs: z.string(),
  status: z.enum(['ok', 'missing']),
});

const COLUMNS =
  'id, file_id, kind, title, request, period_from, period_to, published_at, published_hash, tab_rows, published_values, kept_tabs, status';

function toLink(row: unknown): SheetLink {
  const r = rowSchema.parse(row);
  return {
    id: r.id,
    fileId: r.file_id,
    kind: r.kind,
    title: r.title,
    request: publishedRequestSchema.parse(JSON.parse(r.request)),
    from: r.period_from === '' ? null : r.period_from,
    to: r.period_to,
    publishedAt: r.published_at,
    publishedHash: r.published_hash,
    tabRows: z.record(z.string(), z.number().int().min(0)).parse(JSON.parse(r.tab_rows)),
    publishedValues: z.record(z.string(), publishedRowSchema).parse(JSON.parse(r.published_values)),
    status: r.status,
    keptTabs: z.array(z.string()).parse(JSON.parse(r.kept_tabs)),
  };
}

export function listSheetLinks(db: Db): SheetLink[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM sheet_link ORDER BY period_to DESC, title`)
    .all()
    .map(toLink);
}

export function getSheetLink(db: Db, id: string): SheetLink | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM sheet_link WHERE id = ?`).get(id);
  return row === undefined ? null : toLink(row);
}

/** The workbook for a report and period, if there is one. */
export function findSheetLink(
  db: Db,
  kind: WorkbookKind,
  from: CalendarDate | null,
  to: CalendarDate,
): SheetLink | null {
  const row = db
    .prepare(
      `SELECT ${COLUMNS} FROM sheet_link WHERE kind = ? AND period_from = ? AND period_to = ?`,
    )
    .get(kind, from ?? '', to);
  return row === undefined ? null : toLink(row);
}

export function insertSheetLink(db: Db, link: SheetLink, at: string): void {
  db.prepare(
    `INSERT INTO sheet_link (${COLUMNS}, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    link.id,
    link.fileId,
    link.kind,
    link.title,
    JSON.stringify(link.request),
    link.from ?? '',
    link.to,
    link.publishedAt,
    link.publishedHash,
    JSON.stringify(link.tabRows),
    JSON.stringify(link.publishedValues),
    JSON.stringify(link.keptTabs),
    link.status,
    at,
    at,
  );
}

export function updateSheetLink(db: Db, link: SheetLink, at: string): void {
  db.prepare(
    `UPDATE sheet_link SET file_id = ?, title = ?, request = ?, published_at = ?, published_hash = ?,
       tab_rows = ?, published_values = ?, kept_tabs = ?, status = ?, updated_at = ? WHERE id = ?`,
  ).run(
    link.fileId,
    link.title,
    JSON.stringify(link.request),
    link.publishedAt,
    link.publishedHash,
    JSON.stringify(link.tabRows),
    JSON.stringify(link.publishedValues),
    JSON.stringify(link.keptTabs),
    link.status,
    at,
    link.id,
  );
}
