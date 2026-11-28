import { z } from 'zod';
import type { Business } from '@domain/business';
import { BAS_FREQUENCIES, GST_BASES } from '@shared/kinds';
import type { Db } from './database';
import { calendarDateColumn, flagColumn, timestampColumn } from './row-types';

const rowSchema = z.object({
  name: z.string(),
  abn: z.string(),
  gst_registered: flagColumn,
  gst_basis: z.enum(GST_BASES),
  bas_frequency: z.enum(BAS_FREQUENCIES),
  lock_date: calendarDateColumn.nullable(),
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

/** The business row, or null before setup. */
export function getBusiness(db: Db): Business | null {
  const row = db
    .prepare(
      'SELECT name, abn, gst_registered, gst_basis, bas_frequency, lock_date, created_at, updated_at FROM business WHERE id = 1',
    )
    .get();
  if (row === undefined) return null;
  const parsed = rowSchema.parse(row);
  return {
    name: parsed.name,
    abn: parsed.abn,
    gstRegistered: parsed.gst_registered,
    gstBasis: parsed.gst_basis,
    basFrequency: parsed.bas_frequency,
    lockDate: parsed.lock_date,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  };
}

export function insertBusiness(db: Db, business: Business): void {
  db.prepare(
    `INSERT INTO business
       (id, name, abn, gst_registered, gst_basis, bas_frequency, lock_date, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    business.name,
    business.abn,
    business.gstRegistered ? 1 : 0,
    business.gstBasis,
    business.basFrequency,
    business.lockDate,
    business.createdAt,
    business.updatedAt,
  );
}

/** Moves the lock date (spec 096). The service allows only forwards. */
export function setLockDate(db: Db, lockDate: string, at: string): void {
  db.prepare('UPDATE business SET lock_date = ?, updated_at = ? WHERE id = 1').run(lockDate, at);
}

/** Changes the business's details and GST settings (spec 132). The lock date is never changed here. */
export function updateBusiness(db: Db, business: Business): void {
  db.prepare(
    `UPDATE business SET name = ?, abn = ?, gst_basis = ?, bas_frequency = ?, updated_at = ?
     WHERE id = 1`,
  ).run(business.name, business.abn, business.gstBasis, business.basFrequency, business.updatedAt);
}
