// Renaming and deactivating his bank accounts. A bank account is never deleted: its statement
// lines and the ledger account behind it keep their history. Every change writes an audit row in
// the same transaction.

import type { BankAccount } from '@domain/bank-accounts';
import {
  getBankAccountById,
  listBankAccounts,
  updateBankAccount,
} from '@data/bank-account-repository';
import type { AuditKind } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export type ManageBankAccountError =
  'not-found' | 'empty-name' | 'unchanged' | 'already-inactive' | 'has-active-sub-accounts';

type Outcome = Result<BankAccount, ManageBankAccountError>;

function changeBankAccount(
  ctx: ServiceContext,
  id: string,
  kind: AuditKind,
  change: (
    existing: BankAccount,
  ) => Result<Pick<BankAccount, 'name' | 'active'>, ManageBankAccountError>,
): Outcome {
  return ctx.db.transaction((): Outcome => {
    const existing = getBankAccountById(ctx.db, id);
    if (existing === null) return err('not-found');
    const changed = change(existing);
    if (!changed.ok) return changed;
    const updated: BankAccount = { ...existing, ...changed.value, updatedAt: ctx.clock.now() };
    updateBankAccount(ctx.db, updated);
    recordAudit(ctx, { kind, table: 'bank_account', rowId: id, before: existing, after: updated });
    return ok(updated);
  })();
}

export function renameBankAccount(ctx: ServiceContext, id: string, newName: string): Outcome {
  const name = newName.trim();
  if (name === '') return err('empty-name');
  return changeBankAccount(ctx, id, 'bank-account.rename', (existing) =>
    name === existing.name ? err('unchanged') : ok({ active: existing.active, name }),
  );
}

export function deactivateBankAccount(ctx: ServiceContext, id: string): Outcome {
  return changeBankAccount(ctx, id, 'bank-account.deactivate', (existing) => {
    if (!existing.active) return err('already-inactive');
    const stillInUse = listBankAccounts(ctx.db).some((b) => b.parentId === id && b.active);
    return stillInUse ? err('has-active-sub-accounts') : ok({ name: existing.name, active: false });
  });
}
