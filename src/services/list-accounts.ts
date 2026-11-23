// The chart of accounts with each balance as at today (spec 050). A debit balance is positive and
// a credit balance negative, as in the trial balance, so these agree with it to the cent.

import { listAccounts } from '@data/account-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { listBankAccounts } from '@data/bank-account-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { ZERO_CENTS } from '@shared/money';
import type { AccountRow, AccountsView } from '@shared/views';
import type { TodayContext } from './context';

export function listAccountsWithBalances(ctx: TodayContext): AccountsView {
  const asAt = ctx.clock.today();
  const balances = new Map(
    sumLinesByAccount(ctx.db, { from: null, to: asAt }).map((t) => [
      t.accountId as string,
      t.total,
    ]),
  );
  const taxCodes = new Map(listTaxCodes(ctx.db).map((t) => [t.id as string, t]));
  const banks = new Map(listBankAccounts(ctx.db).map((b) => [b.ledgerAccountId as string, b]));
  const accounts: AccountRow[] = listAccounts(ctx.db).map((account) => {
    const taxCode =
      account.defaultTaxCodeId === null ? undefined : taxCodes.get(account.defaultTaxCodeId);
    const bank = banks.get(account.id);
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      usualGst:
        taxCode === undefined
          ? null
          : { shortCode: taxCode.shortCode, treatment: taxCode.treatment },
      balance: balances.get(account.id) ?? ZERO_CENTS,
      bank: bank === undefined ? null : { bank: bank.bank, lastFour: bank.lastFour },
    };
  });
  return { asAt, accounts };
}
