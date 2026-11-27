// Reads for the Transactions list. An entry's row is worked out from its lines: its total, its GST
// and whether money moved through one of his bank accounts. The filters are all bound parameters,
// so a search word can never become SQL. Only reads: the books are written by the posting service.

import { z } from 'zod';
import type { SummaryLine } from '@domain/entry-summary';
import type { CalendarDate } from '@shared/dates';
import { ENTRY_SOURCE_KINDS, type EntrySourceKind } from '@shared/kinds';
import { asCents } from '@shared/money';
import type { TransactionKind } from '@shared/views';
import type { Db } from './database';
import { calendarDateColumn } from './row-types';

export interface TransactionQuery {
  readonly from: CalendarDate | null;
  readonly to: CalendarDate | null;
  readonly accountId: string | null;
  /** Entries with a line for this contact (the contact page, spec 123). */
  readonly contactId?: string | null;
  /** Only entries that moved money through one of his bank accounts. */
  readonly bankOnly?: boolean;
  readonly kind: TransactionKind;
  /** A word or phrase to find in the description, a payee or an account. */
  readonly search: string | null;
  /** When the search reads as an amount, entries with exactly that total match too. */
  readonly amountCents: number | null;
  readonly limit: number;
  readonly offset: number;
}

export interface EntryRow {
  readonly id: string;
  readonly date: CalendarDate;
  readonly memo: string;
  readonly sourceKind: EntrySourceKind;
}

export interface TransactionQueryResult {
  readonly entries: readonly EntryRow[];
  /** The lines of each entry on this page, in order, ready to summarise. */
  readonly lines: ReadonlyMap<string, SummaryLine[]>;
  readonly matching: number;
  readonly totals: { readonly total: number; readonly gst: number };
  readonly accountTotal: number | null;
}

// `\` escapes the pattern characters, so a search for 50% finds 50% and not everything.
const LIKE_ESCAPE = /[\\%_]/g;

// The entries that match, with the figures the filters need. One entry is one row.
const MATCHED = `
WITH facts AS (
  SELECT
    e.rowid AS rid, e.id AS id, e.entry_date AS entry_date, e.memo AS memo, e.source_kind AS source_kind,
    (SELECT COALESCE(SUM(CASE WHEN l.amount_cents > 0 THEN l.amount_cents ELSE 0 END), 0)
       FROM journal_line l WHERE l.entry_id = e.id) AS total_cents,
    (SELECT COALESCE(SUM(ABS(l.gst_cents)), 0) FROM journal_line l WHERE l.entry_id = e.id) AS gst_cents,
    (SELECT COALESCE(SUM(l.amount_cents), 0) FROM journal_line l
       JOIN bank_account b ON b.ledger_account_id = l.account_id WHERE l.entry_id = e.id) AS bank_net,
    (SELECT COUNT(*) FROM journal_line l
       JOIN bank_account b ON b.ledger_account_id = l.account_id WHERE l.entry_id = e.id) AS bank_lines,
    (@pattern IS NULL
      OR e.memo LIKE @pattern ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM journal_line l
                   JOIN account a ON a.id = l.account_id
                   LEFT JOIN contact c ON c.id = l.payee_id
                  WHERE l.entry_id = e.id
                    AND (a.name LIKE @pattern ESCAPE '\\' OR a.code LIKE @pattern ESCAPE '\\'
                         OR c.name LIKE @pattern ESCAPE '\\'))) AS text_match
  FROM journal_entry e
  WHERE (@from IS NULL OR e.entry_date >= @from)
    AND (@to IS NULL OR e.entry_date <= @to)
    AND (@account IS NULL
         OR EXISTS (SELECT 1 FROM journal_line l WHERE l.entry_id = e.id AND l.account_id = @account))
    AND (@contact IS NULL
         OR EXISTS (SELECT 1 FROM journal_line l WHERE l.entry_id = e.id AND l.payee_id = @contact))
),
matched AS (
  SELECT * FROM facts
  WHERE (@pattern IS NULL OR text_match = 1 OR (@cents IS NOT NULL AND total_cents = @cents))
    AND (@bankOnly = 0 OR bank_lines > 0)
    AND (@kind = 'all'
         OR (@kind = 'money-in' AND bank_lines > 0 AND bank_net > 0)
         OR (@kind = 'money-out' AND bank_lines > 0 AND bank_net < 0)
         OR (@kind = 'transfers' AND bank_lines > 1 AND bank_net = 0))
)`;

const entrySchema = z.object({
  id: z.string().regex(/^ent_/),
  entry_date: calendarDateColumn,
  memo: z.string(),
  source_kind: z.enum(ENTRY_SOURCE_KINDS),
});

const lineSchema = z.object({
  entry_id: z.string(),
  account_id: z.string(),
  code: z.string(),
  name: z.string(),
  is_bank: z.union([z.literal(0), z.literal(1)]),
  amount_cents: z.number().int(),
  gst_cents: z.number().int(),
  has_tax_code: z.union([z.literal(0), z.literal(1)]),
  payee: z.string().nullable(),
});

const countSchema = z.object({
  n: z.number().int(),
  total: z.number().int(),
  gst: z.number().int(),
});

export function queryTransactions(db: Db, query: TransactionQuery): TransactionQueryResult {
  const search = query.search?.trim() ?? '';
  const params = {
    from: query.from,
    to: query.to,
    account: query.accountId,
    contact: query.contactId ?? null,
    bankOnly: query.bankOnly === true ? 1 : 0,
    kind: query.kind,
    pattern: search === '' ? null : `%${search.replace(LIKE_ESCAPE, '\\$&')}%`,
    cents: query.amountCents,
  };

  const page = db
    .prepare(
      `${MATCHED}
       SELECT id, entry_date, memo, source_kind FROM matched
       ORDER BY entry_date DESC, rid DESC LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: query.limit, offset: query.offset })
    .map((row) => entrySchema.parse(row));

  const counts = countSchema.parse(
    db
      .prepare(
        `${MATCHED}
         SELECT COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS total, COALESCE(SUM(gst_cents), 0) AS gst
         FROM matched`,
      )
      .get(params),
  );

  let accountTotal: number | null = null;
  if (query.accountId !== null) {
    const row = db
      .prepare(
        `${MATCHED}
         SELECT COALESCE(SUM(l.amount_cents), 0) AS total FROM journal_line l
         WHERE l.account_id = @account AND l.entry_id IN (SELECT id FROM matched)`,
      )
      .get(params) as { total: number };
    accountTotal = row.total;
  }

  const lines = new Map<string, SummaryLine[]>();
  if (page.length > 0) {
    const rows = db
      .prepare(
        `SELECT l.entry_id AS entry_id, l.account_id AS account_id, a.code AS code, a.name AS name,
                (b.id IS NOT NULL) AS is_bank, l.amount_cents AS amount_cents, l.gst_cents AS gst_cents,
                (l.tax_code_id IS NOT NULL) AS has_tax_code, c.name AS payee
         FROM journal_line l
           JOIN account a ON a.id = l.account_id
           LEFT JOIN bank_account b ON b.ledger_account_id = l.account_id
           LEFT JOIN contact c ON c.id = l.payee_id
         WHERE l.entry_id IN (SELECT value FROM json_each(@ids))
         ORDER BY l.entry_id, l.position`,
      )
      .all({ ids: JSON.stringify(page.map((entry) => entry.id)) });
    for (const row of rows) {
      const r = lineSchema.parse(row);
      const list = lines.get(r.entry_id) ?? [];
      list.push({
        accountId: r.account_id,
        accountCode: r.code,
        accountName: r.name,
        isBank: r.is_bank === 1,
        amount: asCents(r.amount_cents),
        gst: asCents(r.gst_cents),
        hasTaxCode: r.has_tax_code === 1,
        payee: r.payee,
      });
      lines.set(r.entry_id, list);
    }
  }

  return {
    entries: page.map((e) => ({
      id: e.id,
      date: e.entry_date,
      memo: e.memo,
      sourceKind: e.source_kind,
    })),
    lines,
    matching: counts.n,
    totals: { total: counts.total, gst: counts.gst },
    accountTotal,
  };
}
