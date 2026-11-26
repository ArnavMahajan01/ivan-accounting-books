import { z } from 'zod';
import type { Account } from '@domain/accounts';
import type { Id } from '@shared/ids';
import { ACCOUNT_TYPES } from '@shared/kinds';
import type { Db } from './database';
import { flagColumn, timestampColumn } from './row-types';

const COLUMNS =
  'id, code, name, type, parent_id, default_tax_code_id, active, created_at, updated_at';

const rowSchema = z.object({
  id: z.string().regex(/^acc_/),
  code: z.string(),
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  parent_id: z.string().regex(/^acc_/).nullable(),
  default_tax_code_id: z.string().regex(/^tax_/).nullable(),
  active: flagColumn,
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

function toAccount(row: unknown): Account {
  const r = rowSchema.parse(row);
  return {
    id: r.id as Id<'acc'>,
    code: r.code,
    name: r.name,
    type: r.type,
    parentId: r.parent_id as Id<'acc'> | null,
    defaultTaxCodeId: r.default_tax_code_id as Id<'tax'> | null,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Throws if the code is already used: the database enforces it. Services check first. */
export function insertAccount(db: Db, account: Account): void {
  db.prepare(`INSERT INTO account (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    account.id,
    account.code,
    account.name,
    account.type,
    account.parentId,
    account.defaultTaxCodeId,
    account.active ? 1 : 0,
    account.createdAt,
    account.updatedAt,
  );
}

export function getAccountById(db: Db, id: string): Account | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM account WHERE id = ?`).get(id);
  return row === undefined ? null : toAccount(row);
}

export function getAccountByCode(db: Db, code: string): Account | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM account WHERE code = ?`).get(code);
  return row === undefined ? null : toAccount(row);
}

/** Every account, in code order. */
export function listAccounts(db: Db): Account[] {
  return db.prepare(`SELECT ${COLUMNS} FROM account ORDER BY code`).all().map(toAccount);
}

/**
 * Saves the parts of an account that may change: code, name and whether it is active. Its id,
 * type and parent never change, so posted history keeps meaning the same thing.
 */
export function updateAccount(db: Db, account: Account): void {
  db.prepare('UPDATE account SET code = ?, name = ?, active = ?, updated_at = ? WHERE id = ?').run(
    account.code,
    account.name,
    account.active ? 1 : 0,
    account.updatedAt,
    account.id,
  );
}

/** The accounts that have at least one posted line, by id. */
export function accountsWithLines(db: Db): Set<string> {
  const rows = db.prepare('SELECT DISTINCT account_id FROM journal_line').all();
  return new Set(rows.map((r) => z.object({ account_id: z.string() }).parse(r).account_id));
}
