import { z } from 'zod';
import type { AccountTotal } from '@domain/balances';
import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { Db } from './database';
import { centsColumn } from './row-types';

const rowSchema = z.object({
  account_id: z.string().regex(/^acc_/),
  total: centsColumn,
});

/**
 * Each account's lines added up, for entries dated from `from` to `to`, both days included. A
 * null side has no limit. The sum is SQL `SUM` over whole cents, so it is exact.
 */
export function sumLinesByAccount(
  db: Db,
  range: { readonly from: CalendarDate | null; readonly to: CalendarDate | null },
): AccountTotal[] {
  const rows = db
    .prepare(
      `SELECT l.account_id AS account_id, SUM(l.amount_cents) AS total
       FROM journal_line l JOIN journal_entry e ON e.id = l.entry_id
       WHERE (@from IS NULL OR e.entry_date >= @from) AND (@to IS NULL OR e.entry_date <= @to)
       GROUP BY l.account_id`,
    )
    .all({ from: range.from, to: range.to });
  return rows.map((row) => {
    const r = rowSchema.parse(row);
    return { accountId: r.account_id as Id<'acc'>, total: r.total };
  });
}

/**
 * The GST recorded on the lines of entries dated from `from` to `to`, both days included. A
 * line's GST has the sign of its amount, so GST collected on sales is negative and GST paid on
 * purchases is positive. The sum is what is owed to the tax office when negative.
 */
export function sumGstInRange(db: Db, from: CalendarDate, to: CalendarDate): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(l.gst_cents), 0) AS total FROM journal_line l
       JOIN journal_entry e ON e.id = l.entry_id
       WHERE e.entry_date >= ? AND e.entry_date <= ?`,
    )
    .get(from, to) as { total: number };
  return row.total;
}
