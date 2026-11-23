// Adding, renaming and deactivating accounts. Deleting and merging are never offered: an account
// with posted lines keeps its history, and the most that can happen to it is that it goes
// inactive. Every change writes an audit row in the same transaction.

import type { Account } from '@domain/accounts';
import {
  getAccountByCode,
  getAccountById,
  insertAccount,
  updateAccount,
} from '@data/account-repository';
import { newId } from '@shared/ids';
import type { AccountType, AuditKind } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export type ManageAccountError =
  | 'empty-code'
  | 'empty-name'
  | 'code-in-use'
  | 'not-found'
  | 'parent-not-found'
  | 'unchanged'
  | 'already-inactive'
  | 'already-active';

export interface NewAccount {
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  /** The id of the account this one sits under. */
  readonly parentId?: string;
}

type Outcome = Result<Account, ManageAccountError>;

function changeAccount(
  ctx: ServiceContext,
  id: string,
  kind: AuditKind,
  change: (
    existing: Account,
  ) => Result<Pick<Account, 'code' | 'name' | 'active'>, ManageAccountError>,
): Outcome {
  return ctx.db.transaction((): Outcome => {
    const existing = getAccountById(ctx.db, id);
    if (existing === null) return err('not-found');
    const changed = change(existing);
    if (!changed.ok) return changed;
    const updated: Account = { ...existing, ...changed.value, updatedAt: ctx.clock.now() };
    updateAccount(ctx.db, updated);
    recordAudit(ctx, { kind, table: 'account', rowId: id, before: existing, after: updated });
    return ok(updated);
  })();
}

export function addAccount(ctx: ServiceContext, input: NewAccount): Outcome {
  const code = input.code.trim();
  const name = input.name.trim();
  if (code === '') return err('empty-code');
  if (name === '') return err('empty-name');
  return ctx.db.transaction((): Outcome => {
    if (getAccountByCode(ctx.db, code) !== null) return err('code-in-use');
    if (input.parentId !== undefined && getAccountById(ctx.db, input.parentId) === null) {
      return err('parent-not-found');
    }
    const now = ctx.clock.now();
    const account: Account = {
      id: newId('acc', ctx.random),
      code,
      name,
      type: input.type,
      parentId: (input.parentId as Account['parentId'] | undefined) ?? null,
      defaultTaxCodeId: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    insertAccount(ctx.db, account);
    recordAudit(ctx, {
      kind: 'account.add',
      table: 'account',
      rowId: account.id,
      before: null,
      after: account,
    });
    return ok(account);
  })();
}

export function renameAccount(ctx: ServiceContext, id: string, newName: string): Outcome {
  const name = newName.trim();
  if (name === '') return err('empty-name');
  return changeAccount(ctx, id, 'account.rename', (existing) =>
    name === existing.name ? err('unchanged') : ok({ ...existing, name }),
  );
}

export function changeAccountCode(ctx: ServiceContext, id: string, newCode: string): Outcome {
  const code = newCode.trim();
  if (code === '') return err('empty-code');
  return changeAccount(ctx, id, 'account.change-code', (existing) => {
    if (code === existing.code) return err('unchanged');
    const holder = getAccountByCode(ctx.db, code);
    return holder === null ? ok({ ...existing, code }) : err('code-in-use');
  });
}

export function deactivateAccount(ctx: ServiceContext, id: string): Outcome {
  return changeAccount(ctx, id, 'account.deactivate', (existing) =>
    existing.active ? ok({ ...existing, active: false }) : err('already-inactive'),
  );
}

export function reactivateAccount(ctx: ServiceContext, id: string): Outcome {
  return changeAccount(ctx, id, 'account.reactivate', (existing) =>
    existing.active ? err('already-active') : ok({ ...existing, active: true }),
  );
}
