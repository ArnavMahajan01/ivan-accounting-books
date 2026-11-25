// Adds one of his bank accounts, linked to the ledger account that holds its balance. Renaming and
// deactivating are in manage-bank-accounts.ts.

import type { BankAccount } from '@domain/bank-accounts';
import { getAccountById } from '@data/account-repository';
import {
  getBankAccountById,
  getBankAccountByLedgerAccount,
  insertBankAccount,
} from '@data/bank-account-repository';
import { newId } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface NewBankAccount {
  readonly name: string;
  readonly bank: string;
  /** Exactly four digits. The rest of the account number is never stored. */
  readonly lastFour: string;
  readonly ledgerAccountId: string;
  /** Another of his bank accounts that this one sits under (client question 4). */
  readonly parentId?: string;
}

export type AddBankAccountError =
  | 'empty-name'
  | 'empty-bank'
  | 'bad-last-four'
  | 'account-not-found'
  | 'not-an-asset'
  | 'already-linked'
  | 'parent-not-found'
  | 'parent-is-a-sub-account';

export function addBankAccount(
  ctx: ServiceContext,
  input: NewBankAccount,
): Result<BankAccount, AddBankAccountError> {
  const name = input.name.trim();
  const bank = input.bank.trim();
  if (name === '') return err('empty-name');
  if (bank === '') return err('empty-bank');
  if (!/^\d{4}$/.test(input.lastFour)) return err('bad-last-four');
  return ctx.db.transaction((): Result<BankAccount, AddBankAccountError> => {
    const ledger = getAccountById(ctx.db, input.ledgerAccountId);
    if (ledger === null) return err('account-not-found');
    if (ledger.type !== 'asset') return err('not-an-asset');
    if (getBankAccountByLedgerAccount(ctx.db, ledger.id) !== null) return err('already-linked');
    const parent = input.parentId === undefined ? null : getBankAccountById(ctx.db, input.parentId);
    if (input.parentId !== undefined) {
      if (parent === null) return err('parent-not-found');
      // One level only: a sub-account of a sub-account is not something his accounts have.
      if (parent.parentId !== null) return err('parent-is-a-sub-account');
    }
    const now = ctx.clock.now();
    const account: BankAccount = {
      id: newId('bnk', ctx.random),
      name,
      bank,
      lastFour: input.lastFour,
      ledgerAccountId: ledger.id,
      parentId: parent?.id ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    insertBankAccount(ctx.db, account);
    recordAudit(ctx, {
      kind: 'bank-account.add',
      table: 'bank_account',
      rowId: account.id,
      before: null,
      after: account,
    });
    return ok(account);
  })();
}
