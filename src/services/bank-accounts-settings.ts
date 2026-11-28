// Settings, Bank accounts (spec 133): his bank accounts with their bank and last four digits, and
// the asset accounts a new one can be linked to. Adding, renaming and stopping use the services of
// spec 055 (`add-bank-account.ts`, `manage-bank-accounts.ts`), each with its audit row.

import { listAccounts } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { ACCOUNT_ROLES } from '@shared/kinds';
import { listBankAccounts } from '@data/bank-account-repository';
import type { BankAccountsSettings } from '@shared/settings';
import type { ReadContext } from './context';

export function bankAccountsSettings(ctx: ReadContext): BankAccountsSettings {
  const accounts = listAccounts(ctx.db);
  const banks = listBankAccounts(ctx.db);
  // Accounts the app posts to by itself (transfers in transit, accounts receivable) never hold a
  // bank's balance.
  const linked = new Set<string>([
    ...banks.map((b) => b.ledgerAccountId as string),
    ...ACCOUNT_ROLES.flatMap((role) => accountForRole(ctx.db, role) ?? []),
  ]);
  const byId = new Map(accounts.map((a) => [a.id as string, a]));
  return {
    accounts: banks.map((b) => {
      const ledger = byId.get(b.ledgerAccountId);
      return {
        id: b.id,
        name: b.name,
        bank: b.bank,
        lastFour: b.lastFour,
        active: b.active,
        ledger: { code: ledger?.code ?? '', name: ledger?.name ?? '' },
      };
    }),
    freeLedgers: accounts
      .filter((a) => a.type === 'asset' && a.active && !linked.has(a.id))
      .map((a) => ({ id: a.id, code: a.code, name: a.name })),
  };
}
