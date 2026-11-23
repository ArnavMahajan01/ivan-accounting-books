import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import type { NextStep } from '@shared/views';
import { date } from '../test-bridge';
import { describeStep } from './next-step-text';

describe('describeStep', () => {
  it('words a review job with its count and oldest date, and sends him to To review', () => {
    expect(
      describeStep({ id: 'review-lines', state: 'todo', count: 37, oldest: date('2026-11-01') }),
    ).toEqual({
      title: 'Review 37 bank lines',
      detail: 'The oldest is from 01/11/2026.',
      action: { label: 'Review', route: 'to-review' },
    });
    expect(describeStep({ id: 'review-lines', state: 'todo', count: 1, oldest: null }).title).toBe(
      'Review 1 bank line',
    );
  });

  it('ticks a job that is done, with no button', () => {
    const done: NextStep[] = [
      { id: 'review-lines', state: 'done', count: 0, oldest: null },
      { id: 'back-up', state: 'done', daysSince: 2 },
      { id: 'accountant-changes', state: 'done', count: 0 },
    ];
    for (const step of done) expect(describeStep(step).action).toBeNull();
    expect(describeStep(done[0] as NextStep).title).toBe('Bank lines reviewed');
  });

  it('words reconciling with the statement balance, and backing up with how long ago', () => {
    expect(
      describeStep({
        id: 'reconcile',
        state: 'todo',
        accountName: 'Business One ··4821',
        statementDate: date('2026-11-13'),
        statementBalance: asCents(1864235),
      }),
    ).toMatchObject({
      title: 'Reconcile Business One ··4821',
      detail: 'Statement closing balance on 13/11/2026: $18,642.35',
      action: { label: 'Reconcile', route: 'bank' },
    });
    expect(describeStep({ id: 'back-up', state: 'todo', daysSince: 9 })).toMatchObject({
      title: 'Back up your books',
      detail: 'Your last backup was 9 days ago.',
      action: { label: 'Back up now' },
    });
    expect(describeStep({ id: 'back-up', state: 'todo', daysSince: null }).detail).toBe(
      'There is no backup yet.',
    );
    expect(describeStep({ id: 'back-up', state: 'todo', daysSince: 1 }).detail).toBe(
      'Your last backup was 1 day ago.',
    );
  });

  it('words the BAS with its due date, in days, and whether it is ready', () => {
    const bas = (daysToDue: number, ready: boolean) =>
      describeStep({
        id: 'bas-due',
        state: 'todo',
        periodLabel: 'Oct–Dec 2026',
        dueDate: date('2027-02-28'),
        daysToDue,
        ready,
      });
    expect(bas(97, false)).toMatchObject({
      title: 'BAS for Oct–Dec 2026',
      detail: 'Due 28/02/2027, in 97 days. Not ready until the period ends.',
      action: { label: 'Open worksheet', route: 'reports' },
    });
    expect(bas(3, true).detail).toBe('Due 28/02/2027, in 3 days.');
    expect(bas(-2, true).detail).toBe('Due 28/02/2027, 2 days overdue.');
  });

  it('words the accountant’s changes', () => {
    expect(describeStep({ id: 'accountant-changes', state: 'todo', count: 2 })).toMatchObject({
      title: '2 changes from your accountant',
      action: { label: 'Review changes', route: 'accountant-changes' },
    });
  });
});
