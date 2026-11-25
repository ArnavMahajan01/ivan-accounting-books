// The Bank page's table, and the count on the sidebar's To review (specs 064 and 065): each of his
// bank accounts with what the ledger holds for it, the balance its latest imported statement
// states, and how many imported lines wait for review.

import { sumLinesByAccount } from '@data/balance-queries';
import { listBankAccounts } from '@data/bank-account-repository';
import {
  countLinesToReviewByAccount,
  countUsedLinesInBatch,
  lastImportedBatch,
  latestBatchForAccount,
  summariseLinesToReview,
} from '@data/statement-repository';
import type { BankAccount } from '@domain/bank-accounts';
import { ZERO_CENTS } from '@shared/money';
import type { BankAccountRow, BankView } from '@shared/views';
import type { ReadContext, TodayContext } from './context';

/** Each parent account, with its sub-accounts straight after it. */
function inDisplayOrder(accounts: readonly BankAccount[]): BankAccount[] {
  const parents = accounts.filter(
    (a) => a.parentId === null || !accounts.some((p) => p.id === a.parentId),
  );
  return parents.flatMap((p) => [p, ...accounts.filter((a) => a.parentId === p.id)]);
}

export function getBankView(ctx: TodayContext): BankView {
  const totals = new Map(
    sumLinesByAccount(ctx.db, { from: null, to: ctx.clock.today() }).map((t) => [
      t.accountId as string,
      t.total,
    ]),
  );
  const waiting = countLinesToReviewByAccount(ctx.db);
  const rows = inDisplayOrder(listBankAccounts(ctx.db).filter((b) => b.active)).map(
    (b): BankAccountRow => {
      const batch = latestBatchForAccount(ctx.db, b.id);
      // The file imported last, if none of its lines has moved on, can be taken back.
      const last = lastImportedBatch(ctx.db, b.id);
      const undoable = last !== null && countUsedLinesInBatch(ctx.db, last.id) === 0 ? last : null;
      return {
        id: b.id,
        name: b.name,
        lastFour: b.lastFour,
        balance: totals.get(b.ledgerAccountId) ?? ZERO_CENTS,
        lastStatement:
          batch?.closingBalance == null
            ? null
            : { balance: batch.closingBalance.amount, date: batch.closingBalance.date },
        linesToReview: waiting.get(b.id) ?? 0,
        reconciledTo: null,
        parentId: b.parentId,
        undoableImport:
          undoable === null
            ? null
            : {
                batchId: undoable.id,
                fileName: undoable.fileName,
                added: undoable.newCount,
                period: { from: undoable.periodFrom, to: undoable.periodTo },
              },
      };
    },
  );
  return { accounts: rows };
}

export function getReviewCount(ctx: ReadContext): { readonly count: number } {
  return { count: summariseLinesToReview(ctx.db).count };
}
