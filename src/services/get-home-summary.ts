// Home's four numbers and its to-do list (specs 048 and 049): bank balance, lines to review, GST
// owing for the BAS period in progress, and profit for the financial year so far. All are worked
// out from the journal lines each time, as at today, and never stored.

import { sumGstInRange, sumLinesByAccount } from '@data/balance-queries';
import { listAccounts } from '@data/account-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getBusiness } from '@data/business-repository';
import { countJournalEntries } from '@data/journal-queries';
import { summariseLinesToReview } from '@data/statement-repository';
import { isUpToDate, nextSteps, type NextStepId } from '@domain/next-steps';
import { basPeriodOf, financialYearOf } from '@domain/periods';
import { compareDates } from '@shared/dates';
import { addCents, asCents, negateCents, ZERO_CENTS } from '@shared/money';
import type { HomeSummary } from '@shared/views';
import { checkBooks } from './check-books';
import type { TodayContext } from './context';

/**
 * The jobs the app can do today. Home shows only these. Each folder that builds a feature adds its
 * job here: review (folder 06), reconcile (07), BAS (08), accountant changes (09), back up (11).
 */
export const AVAILABLE_NEXT_STEPS: ReadonlySet<NextStepId> = new Set<NextStepId>(['review-lines']);

export function getHomeSummary(ctx: TodayContext): HomeSummary {
  const today = ctx.clock.today();
  const business = getBusiness(ctx.db);
  const year = financialYearOf(today);
  const period = basPeriodOf(today, business?.basFrequency ?? 'quarterly');

  const totals = new Map(
    sumLinesByAccount(ctx.db, { from: null, to: today }).map((t) => [
      t.accountId as string,
      t.total,
    ]),
  );
  const banks = listBankAccounts(ctx.db).filter((b) => b.active);
  const bankBalance = banks.reduce(
    (sum, b) => addCents(sum, totals.get(b.ledgerAccountId) ?? ZERO_CENTS),
    ZERO_CENTS,
  );

  // Profit for the year so far: income less expenses, from the first of July to today.
  const inYear = new Map(
    sumLinesByAccount(ctx.db, { from: year.start, to: today }).map((t) => [
      t.accountId as string,
      t.total,
    ]),
  );
  let incomeAndExpenses = ZERO_CENTS;
  for (const account of listAccounts(ctx.db)) {
    if (account.type === 'income' || account.type === 'expense') {
      incomeAndExpenses = addCents(incomeAndExpenses, inYear.get(account.id) ?? ZERO_CENTS);
    }
  }

  // GST owing for the period in progress: the GST on its entries, collected less paid. The GST on
  // a line has the sign of its amount, so a sale's is negative and the total is negated.
  const periodEnd = compareDates(period.end, today) < 0 ? period.end : today;
  const gstTotal = sumGstInRange(ctx.db, period.start, periodEnd);

  const toReview = summariseLinesToReview(ctx.db);
  const steps = nextSteps({
    today,
    available: AVAILABLE_NEXT_STEPS,
    linesToReview: toReview.count,
    oldestLineToReview: toReview.oldest,
    unreconciled: [],
    daysSinceBackup: null,
    basPeriod: null,
    accountantChangesWaiting: 0,
  });

  return {
    brandNew: countJournalEntries(ctx.db) === 0,
    bank: { balance: bankBalance, accountCount: banks.length },
    linesToReview: toReview,
    gst: {
      owing: negateCents(asCents(gstTotal)),
      periodLabel: period.label,
      periodEnd: period.end,
    },
    profit: { amount: negateCents(incomeAndExpenses), yearLabel: year.label, from: year.start },
    nextSteps: steps,
    upToDate: isUpToDate(steps),
    warnings: checkBooks({ db: ctx.db }).problems,
  };
}
