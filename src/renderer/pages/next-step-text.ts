// The words for each job on Home, from the facts the main process sends. Plain language, in the
// same words as the buttons and pages (guide-writing-rules.md).

import { formatDateAU } from '@shared/dates';
import { assertNever } from '@shared/kinds';
import { formatCents } from '@shared/money';
import type { NextStep } from '@shared/views';
import type { RouteId } from '../routes';

export interface StepText {
  readonly title: string;
  readonly detail: string;
  /** The one button on the row, and the page it opens. Null for a job that is done. */
  readonly action: { readonly label: string; readonly route: RouteId } | null;
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

export function describeStep(step: NextStep): StepText {
  switch (step.id) {
    case 'review-lines':
      return step.state === 'done'
        ? { title: 'Bank lines reviewed', detail: 'No bank lines are waiting.', action: null }
        : {
            title: `Review ${plural(step.count, 'bank line', 'bank lines')}`,
            detail:
              step.oldest === null
                ? 'They are waiting for an account.'
                : `The oldest is from ${formatDateAU(step.oldest)}.`,
            action: { label: 'Review', route: 'to-review' },
          };
    case 'reconcile':
      return {
        title: `Reconcile ${step.accountName}`,
        detail: `Statement closing balance on ${formatDateAU(step.statementDate)}: ${formatCents(step.statementBalance)}`,
        action: { label: 'Reconcile', route: 'bank' },
      };
    case 'back-up':
      return step.state === 'done'
        ? { title: 'Books backed up', detail: 'Your last backup is recent.', action: null }
        : {
            title: 'Back up your books',
            detail:
              step.daysSince === null
                ? 'There is no backup yet.'
                : `Your last backup was ${plural(step.daysSince, 'day', 'days')} ago.`,
            action: { label: 'Back up now', route: 'settings' },
          };
    case 'bas-due': {
      const when =
        step.daysToDue < 0
          ? `${plural(-step.daysToDue, 'day', 'days')} overdue`
          : `in ${plural(step.daysToDue, 'day', 'days')}`;
      return {
        title: `BAS for ${step.periodLabel}`,
        detail: `Due ${formatDateAU(step.dueDate)}, ${when}.${step.ready ? '' : ' Not ready until the period ends.'}`,
        action: { label: 'Open worksheet', route: 'reports' },
      };
    }
    case 'accountant-changes':
      return step.state === 'done'
        ? { title: 'Accountant’s changes', detail: 'None are waiting.', action: null }
        : {
            title: `${plural(step.count, 'change', 'changes')} from your accountant`,
            detail: 'They wait for you to accept or reject them.',
            action: { label: 'Review changes', route: 'accountant-changes' },
          };
    default:
      return assertNever(step);
  }
}
