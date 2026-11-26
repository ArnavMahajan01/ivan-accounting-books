// Closing a BAS period in order (specs 096, 097, wireframe W06 Option 3): every bank line reviewed,
// every bank account reconciled to the period's end, the BAS worksheet checked, then the lock. The
// lock date only moves forwards (client question 20, assumed: no unlock in v1), and the posting
// service then refuses anything dated on or before it.

import { listBankAccounts } from '@data/bank-account-repository';
import { getBusiness, setLockDate } from '@data/business-repository';
import { lastReconciledDate } from '@data/reconcile-repository';
import { linesWithTaxCode } from '@data/report-queries';
import { listWaitingLines } from '@data/review-repository';
import { basFigures } from '@domain/bas';
import { isLocked } from '@domain/journal';
import { basPeriodOf } from '@domain/periods';
import { addDays, compareDates, type CalendarDate } from '@shared/dates';
import { err, ok, type Result } from '@shared/result';
import type { QuarterCloseView } from '@shared/views';
import { recordAudit } from './audit';
import type { ServiceContext, TodayContext } from './context';

/** The BAS period to close: the one that ends on `end`, or else the last one that has ended. */
export function getQuarterClose(
  ctx: TodayContext,
  end: CalendarDate | null,
): Result<QuarterCloseView, 'not-set-up'> {
  const business = getBusiness(ctx.db);
  if (business === null) return err('not-set-up');
  const frequency = business.basFrequency;
  const period =
    end === null
      ? basPeriodOf(addDays(basPeriodOf(ctx.clock.today(), frequency).start, -1), frequency)
      : basPeriodOf(end, frequency);
  const inPeriod = (date: CalendarDate) =>
    compareDates(date, period.start) >= 0 && compareDates(date, period.end) <= 0;
  const bas = basFigures(
    linesWithTaxCode(ctx.db, period.start, period.end).flatMap((l) =>
      l.treatment === null
        ? []
        : [{ accountType: l.accountType, treatment: l.treatment, amount: l.amount, gst: l.gst }],
    ),
  );
  return ok({
    period: { from: period.start, to: period.end, label: period.label },
    linesWaiting: listWaitingLines(ctx.db).filter((l) => inPeriod(l.date)).length,
    accounts: listBankAccounts(ctx.db)
      .filter((b) => b.active)
      .map((b) => {
        const reconciledTo = lastReconciledDate(ctx.db, b.id);
        return {
          id: b.id,
          name: b.name,
          reconciledTo,
          done: reconciledTo !== null && compareDates(reconciledTo, period.end) >= 0,
        };
      }),
    bas,
    locked: isLocked(period.end, business.lockDate),
    lockDate: business.lockDate,
  });
}

/** Locks everything on or before `endDate`, with an audit row. Only forwards. */
export function lockPeriod(
  ctx: ServiceContext,
  endDate: CalendarDate,
): Result<CalendarDate, 'not-set-up' | 'not-forwards'> {
  return ctx.db.transaction((): Result<CalendarDate, 'not-set-up' | 'not-forwards'> => {
    const business = getBusiness(ctx.db);
    if (business === null) return err('not-set-up');
    if (business.lockDate !== null && compareDates(endDate, business.lockDate) <= 0) {
      return err('not-forwards');
    }
    setLockDate(ctx.db, endDate, ctx.clock.now());
    recordAudit(ctx, {
      kind: 'business.lock',
      table: 'business',
      rowId: '1',
      before: { lockDate: business.lockDate },
      after: { lockDate: endDate },
    });
    return ok(endDate);
  })();
}
