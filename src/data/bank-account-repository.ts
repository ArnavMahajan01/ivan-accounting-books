import { z } from 'zod';
import type { BankAccount } from '@domain/bank-accounts';
import type { Id } from '@shared/ids';
import type { Db } from './database';
import { flagColumn, timestampColumn } from './row-types';

const COLUMNS =
  'id, name, bank, last_four, ledger_account_id, parent_id, active, created_at, updated_at';

const rowSchema = z.object({
  id: z.string().regex(/^bnk_/),
  name: z.string(),
  bank: z.string(),
  last_four: z.string().regex(/^\d{4}$/),
  ledger_account_id: z.string().regex(/^acc_/),
  parent_id: z.string().regex(/^bnk_/).nullable(),
  active: flagColumn,
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

function toBankAccount(row: unknown): BankAccount {
  const r = rowSchema.parse(row);
  return {
    id: r.id as Id<'bnk'>,
    name: r.name,
    bank: r.bank,
    lastFour: r.last_four,
    ledgerAccountId: r.ledger_account_id as Id<'acc'>,
    parentId: r.parent_id as Id<'bnk'> | null,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertBankAccount(db: Db, account: BankAccount): void {
  db.prepare(`INSERT INTO bank_account (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    account.id,
    account.name,
    account.bank,
    account.lastFour,
    account.ledgerAccountId,
    account.parentId,
    account.active ? 1 : 0,
    account.createdAt,
    account.updatedAt,
  );
}

export function getBankAccountById(db: Db, id: string): BankAccount | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM bank_account WHERE id = ?`).get(id);
  return row === undefined ? null : toBankAccount(row);
}

/** Saves a changed name or active flag. The other columns never change after the account is added. */
export function updateBankAccount(db: Db, account: BankAccount): void {
  db.prepare('UPDATE bank_account SET name = ?, active = ?, updated_at = ? WHERE id = ?').run(
    account.name,
    account.active ? 1 : 0,
    account.updatedAt,
    account.id,
  );
}

export function getBankAccountByLedgerAccount(db: Db, ledgerAccountId: string): BankAccount | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM bank_account WHERE ledger_account_id = ?`)
    .get(ledgerAccountId);
  return row === undefined ? null : toBankAccount(row);
}

/** Every bank account, in the order they were added. */
export function listBankAccounts(db: Db): BankAccount[] {
  return db.prepare(`SELECT ${COLUMNS} FROM bank_account ORDER BY rowid`).all().map(toBankAccount);
}
