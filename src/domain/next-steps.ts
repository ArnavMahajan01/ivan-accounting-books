// Home's to-do list (wireframe W03, Option 2): which jobs to show, and in what order. Pure: the
// caller passes the counts and dates. A job whose feature does not exist yet is never shown, so
// Home grows as the app does: `available` lists the jobs the app can do today.

import type { CalendarDate } from '@shared/dates';
import { daysBetween } from '@shared/dates';
import type { Cents } from '@shared/money';
import type { NextStep, NextStepId } from '@shared/views';

export { NEXT_STEP_IDS, type NextStep, type NextStepId } from '@shared/views';

export interface NextStepInputs {
  readonly today: CalendarDate;
  /** The jobs the app can do today. */
  readonly available: ReadonlySet<NextStepId>;
  readonly linesToReview: number;
  readonly oldestLineToReview: CalendarDate | null;
  /** Bank accounts whose last statement balance has not been reconciled to the books. */
  readonly unreconciled: readonly {
    readonly accountName: string;
    readonly statementDate: CalendarDate;
    readonly statementBalance: Cents;
  }[];
  /** Whole days since the last backup, or null if there has never been one. */
  readonly daysSinceBackup: number | null;
  /** The BAS period in progress, with when it is due and whether it has ended. */
  readonly basPeriod: {
    readonly label: string;
    readonly dueDate: CalendarDate;
    readonly ended: boolean;
  } | null;
  readonly accountantChangesWaiting: number;
}

/** A backup older than this many days is a job. */
export const BACKUP_MAX_DAYS = 7;

export function nextSteps(input: NextStepInputs): NextStep[] {
  const steps: NextStep[] = [];
  const has = (id: NextStepId) => input.available.has(id);

  if (has('review-lines')) {
    steps.push({
      id: 'review-lines',
      state: input.linesToReview > 0 ? 'todo' : 'done',
      count: input.linesToReview,
      oldest: input.oldestLineToReview,
    });
  }
  if (has('reconcile')) {
    for (const account of input.unreconciled) {
      steps.push({ id: 'reconcile', state: 'todo', ...account });
    }
  }
  if (has('back-up')) {
    const stale = input.daysSinceBackup === null || input.daysSinceBackup > BACKUP_MAX_DAYS;
    steps.push({ id: 'back-up', state: stale ? 'todo' : 'done', daysSince: input.daysSinceBackup });
  }
  if (has('bas-due') && input.basPeriod !== null) {
    steps.push({
      id: 'bas-due',
      state: 'todo',
      periodLabel: input.basPeriod.label,
      dueDate: input.basPeriod.dueDate,
      daysToDue: daysBetween(input.today, input.basPeriod.dueDate),
      ready: input.basPeriod.ended,
    });
  }
  if (has('accountant-changes')) {
    steps.push({
      id: 'accountant-changes',
      state: input.accountantChangesWaiting > 0 ? 'todo' : 'done',
      count: input.accountantChangesWaiting,
    });
  }
  return steps;
}

/** True when every job shown is done, or none is shown. */
export function isUpToDate(steps: readonly NextStep[]): boolean {
  return steps.every((step) => step.state === 'done');
}
