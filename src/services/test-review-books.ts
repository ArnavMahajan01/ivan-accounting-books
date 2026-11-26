// Plain books with Business One and Business Cash Reserve, and a way to add waiting bank lines
// without a file, for the tests of folders 06 and 07. Invented data only.

import { getAccountByCode } from '@data/account-repository';
import { insertImportBatch, insertStatementLine } from '@data/statement-repository';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents } from '@shared/money';
import { addBankAccount } from './add-bank-account';
import { setupBusiness } from './setup-business';
import { createTestContext } from './test-context';

export const day = (text: string): CalendarDate => {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error(text);
  return parsed.value;
};

export function reviewBooks() {
  const ctx = createTestContext();
  setupBusiness(ctx, {
    name: 'Harbour Lane Joinery Pty Ltd',
    abn: '18 123 456 789',
    gstRegistered: true,
    gstBasis: 'cash',
    basFrequency: 'quarterly',
  });
  const acc = (code: string): Id<'acc'> => {
    const account = getAccountByCode(ctx.db, code);
    if (account === null) throw new Error(code);
    return account.id;
  };
  const bank = (name: string, lastFour: string, code: string): Id<'bnk'> => {
    const added = addBankAccount(ctx, {
      name,
      bank: 'Westpac',
      lastFour,
      ledgerAccountId: acc(code),
    });
    if (!added.ok) throw new Error(added.error);
    const batch = `imp_${lastFour}` as const;
    insertImportBatch(ctx.db, {
      id: batch,
      bankAccountId: added.value.id,
      fileName: 'invented.ofx',
      format: 'ofx',
      fileHash: '0'.repeat(64),
      periodFrom: day('2026-11-01'),
      periodTo: day('2026-11-30'),
      newCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      openingBalance: null,
      closingBalance: null,
      importedAt: ctx.clock.now(),
    });
    return added.value.id;
  };
  const one = bank('Business One ··4821', '4821', '1000');
  const reserve = bank('Business Cash Reserve ··7730', '7730', '1010');
  let count = 0;
  /** Adds a waiting line and gives its id. */
  const line = (
    description: string,
    amount: number,
    date = '2026-11-04',
    account = one,
  ): Id<'stl'> => {
    count += 1;
    const id = `stl_t${String(count)}` as Id<'stl'>;
    insertStatementLine(ctx.db, {
      id,
      bankAccountId: account,
      batchId: account === one ? 'imp_4821' : 'imp_7730',
      date: day(date),
      description,
      amount: asCents(amount),
      balance: null,
      key: `key${String(count)}`,
      status: 'to-review',
      createdAt: ctx.clock.now(),
    });
    return id;
  };
  return { ctx, acc, one, reserve, line };
}
