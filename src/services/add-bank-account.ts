// Adds one of his bank accounts, linked to the ledger account that holds its balance. Spec 055 adds
// renaming and deactivating.

import type { BankAccount } from '@domain/bank-accounts';
import { getAccountById } from '@data/account-repository';
import { getBankAccountByLedgerAccount, insertBankAccount } from '@data/bank-account-repository';
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
}

export type AddBankAccountError =
  | 'empty-name'
  | 'empty-bank'
  | 'bad-last-four'
  | 'account-not-found'
  | 'not-an-asset'
  | 'already-linked';

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
    const now = ctx.clock.now();
    const account: BankAccount = {
      id: newId('bnk', ctx.random),
      name,
      bank,
      lastFour: input.lastFour,
      ledgerAccountId: ledger.id,
      parentId: null,
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
