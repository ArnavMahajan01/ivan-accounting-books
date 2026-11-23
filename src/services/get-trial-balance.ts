import { listAccounts } from '@data/account-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { buildTrialBalance, type TrialBalance } from '@domain/balances';
import { compareDates, type CalendarDate } from '@shared/dates';
import { err, ok, type Result } from '@shared/result';
import type { ReadContext } from './context';

export interface DateRange {
  /** The first day counted, or null for the beginning of the books. */
  readonly from: CalendarDate | null;
  /** The last day counted, or null for no end. */
  readonly to: CalendarDate | null;
}

export type TrialBalanceError = 'range-ends-before-it-starts';

/** The trial balance over a range of days, worked out from the journal lines each time. */
export function getTrialBalance(
  ctx: ReadContext,
  range: DateRange,
): Result<TrialBalance, TrialBalanceError> {
  if (range.from !== null && range.to !== null && compareDates(range.from, range.to) > 0) {
    return err('range-ends-before-it-starts');
  }
  return ok(buildTrialBalance(listAccounts(ctx.db), sumLinesByAccount(ctx.db, range), range));
}
