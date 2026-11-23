import { z } from 'zod';
import type { TaxCode } from '@domain/tax-codes';
import type { Id } from '@shared/ids';
import { TAX_TREATMENTS } from '@shared/kinds';
import type { Db } from './database';
import { flagColumn } from './row-types';

const COLUMNS = 'id, short_code, name, treatment, rate_bp, active';

const rowSchema = z.object({
  id: z.string().regex(/^tax_/),
  short_code: z.string(),
  name: z.string(),
  treatment: z.enum(TAX_TREATMENTS),
  rate_bp: z.number().int().min(0).max(10000),
  active: flagColumn,
});

function toTaxCode(row: unknown): TaxCode {
  const r = rowSchema.parse(row);
  return {
    id: r.id as Id<'tax'>,
    shortCode: r.short_code,
    name: r.name,
    treatment: r.treatment,
    rateBp: r.rate_bp,
    active: r.active,
  };
}

export function listTaxCodes(db: Db): TaxCode[] {
  return db.prepare(`SELECT ${COLUMNS} FROM tax_code ORDER BY short_code`).all().map(toTaxCode);
}

export function getTaxCodeById(db: Db, id: string): TaxCode | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM tax_code WHERE id = ?`).get(id);
  return row === undefined ? null : toTaxCode(row);
}

export function getTaxCodeByShortCode(db: Db, shortCode: string): TaxCode | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM tax_code WHERE short_code = ?`).get(shortCode);
  return row === undefined ? null : toTaxCode(row);
}
