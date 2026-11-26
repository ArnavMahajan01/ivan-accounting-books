// Reconciling a bank account to a statement (spec 085). The books' balance for the account on the
// statement's day comes from posted lines only. The difference from the statement's balance is
// explained by the lines still waiting in To review on or before that day that the books do not
// hold yet (a line that matches an entry is already counted). It can be finished only
// when the difference is zero; then the posted lines it covered are marked, so undoing one of them
// later is refused (spec 075).

import { sumLinesByAccount } from '@data/balance-queries';
import { getBankAccountById } from '@data/bank-account-repository';
import {
  insertReconciliation,
  lastReconciledDate,
  markLinesReconciled,
} from '@data/reconcile-repository';
import { listWaitingLines } from '@data/review-repository';
import { compareDates, type CalendarDate } from '@shared/dates';
import { newId } from '@shared/ids';
import { asCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { ReconcileView } from '@shared/views';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import { entryMatchesFor } from './line-matches';

export interface ReconcileInput {
  readonly bankAccountId: string;
  readonly statementDate: CalendarDate;
  readonly statementBalance: Cents;
}

export type ReconcileRefusal = 'not-found' | 'before-last' | 'difference';

export function checkReconcile(
  ctx: ReadContext,
  input: ReconcileInput,
): Result<ReconcileView, 'not-found'> {
  const account = getBankAccountById(ctx.db, input.bankAccountId);
  if (account === null) return err('not-found');
  const booksBalance = asCents(
    sumLinesByAccount(ctx.db, { from: null, to: input.statementDate }).find(
      (t) => t.accountId === account.ledgerAccountId,
    )?.total ?? 0,
  );
  // A waiting line that matches an entry already in the books is counted there already, so it does
  // not explain a difference: only lines missing from the books do.
  const all = listWaitingLines(ctx.db);
  const matched = entryMatchesFor(ctx, all);
  const waiting = all.filter(
    (l) =>
      l.bankAccountId === account.id &&
      compareDates(l.date, input.statementDate) <= 0 &&
      !matched.has(l.id),
  );
  const waitingTotal = waiting.reduce((sum, l) => sum + l.amount, 0);
  const difference = asCents(input.statementBalance - booksBalance);
  return ok({
    accountName: account.name,
    statementDate: input.statementDate,
    statementBalance: input.statementBalance,
    booksBalance,
    difference,
    waiting: waiting.map((l) => ({
      id: l.id,
      date: l.date,
      description: l.description,
      amount: l.amount,
    })),
    // Whether posting the waiting lines would close the gap, so the screen can say so.
    explainedByWaiting: difference !== 0 && waitingTotal === difference,
    lastReconciled: lastReconciledDate(ctx.db, account.id),
  });
}

export function finishReconcile(
  ctx: ServiceContext,
  input: ReconcileInput,
): Result<{ readonly lines: number }, ReconcileRefusal> {
  return ctx.db.transaction((): Result<{ readonly lines: number }, ReconcileRefusal> => {
    const check = checkReconcile(ctx, input);
    if (!check.ok) return check;
    const last = check.value.lastReconciled;
    if (last !== null && compareDates(input.statementDate, last) <= 0) return err('before-last');
    if (check.value.difference !== 0) return err('difference');
    const id = newId('rec', ctx.random);
    const record = {
      id,
      bankAccountId: input.bankAccountId,
      statementDate: input.statementDate,
      statementBalance: input.statementBalance,
      booksBalance: check.value.booksBalance,
      doneAt: ctx.clock.now(),
    };
    insertReconciliation(ctx.db, record);
    const lines = markLinesReconciled(ctx.db, input.bankAccountId, input.statementDate, id);
    recordAudit(ctx, {
      kind: 'reconcile.finish',
      table: 'reconciliation',
      rowId: id,
      before: null,
      after: { ...record, lines },
    });
    return ok({ lines });
  })();
}
