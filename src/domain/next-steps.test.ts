import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import {
  BACKUP_MAX_DAYS,
  isUpToDate,
  NEXT_STEP_IDS,
  nextSteps,
  type NextStepId,
  type NextStepInputs,
} from './next-steps';

const d = (text: string) => text as CalendarDate;
const base: NextStepInputs = {
  today: d('2026-11-23'),
  available: new Set<NextStepId>(NEXT_STEP_IDS),
  linesToReview: 37,
  oldestLineToReview: d('2026-11-01'),
  unreconciled: [
    {
      accountName: 'Business One ··4821',
      statementDate: d('2026-11-13'),
      statementBalance: asCents(1864235),
    },
  ],
  daysSinceBackup: 9,
  basPeriod: { label: 'Oct–Dec 2026', dueDate: d('2027-02-28'), ended: false },
  accountantChangesWaiting: 2,
  overdueInvoices: { count: 0, cents: asCents(0) },
};

describe('nextSteps', () => {
  it('lists every job in order: review, reconcile, back up, BAS, then the accountant’s changes', () => {
    expect(nextSteps(base).map((s) => [s.id, s.state])).toEqual([
      ['review-lines', 'todo'],
      ['reconcile', 'todo'],
      ['back-up', 'todo'],
      ['bas-due', 'todo'],
      ['accountant-changes', 'todo'],
    ]);
  });

  it('gives each job its facts', () => {
    const steps = nextSteps(base);
    expect(steps[0]).toEqual({
      id: 'review-lines',
      state: 'todo',
      count: 37,
      oldest: '2026-11-01',
    });
    expect(steps[1]).toMatchObject({
      id: 'reconcile',
      accountName: 'Business One ··4821',
      statementBalance: 1864235,
    });
    expect(steps[2]).toEqual({ id: 'back-up', state: 'todo', daysSince: 9 });
    expect(steps[3]).toEqual({
      id: 'bas-due',
      state: 'todo',
      periodLabel: 'Oct–Dec 2026',
      dueDate: '2027-02-28',
      daysToDue: 97,
      ready: false,
    });
  });

  it('never shows a job whose feature does not exist yet', () => {
    expect(nextSteps({ ...base, available: new Set() })).toEqual([]);
    expect(
      nextSteps({ ...base, available: new Set<NextStepId>(['back-up']) }).map((s) => s.id),
    ).toEqual(['back-up']);
  });

  it('shows one reconcile job for each account that needs it, and none when all are done', () => {
    const two = [
      ...base.unreconciled,
      {
        accountName: 'Cash Reserve ··7730',
        statementDate: d('2026-11-13'),
        statementBalance: asCents(2500000),
      },
    ];
    expect(
      nextSteps({ ...base, unreconciled: two }).filter((s) => s.id === 'reconcile'),
    ).toHaveLength(2);
    expect(nextSteps({ ...base, unreconciled: [] }).filter((s) => s.id === 'reconcile')).toEqual(
      [],
    );
  });

  it('ticks off the jobs that are done, so Home can say he is up to date', () => {
    const caughtUp = nextSteps({
      ...base,
      linesToReview: 0,
      oldestLineToReview: null,
      unreconciled: [],
      daysSinceBackup: 2,
      basPeriod: null,
      accountantChangesWaiting: 0,
    });
    expect(caughtUp.map((s) => [s.id, s.state])).toEqual([
      ['review-lines', 'done'],
      ['back-up', 'done'],
      ['accountant-changes', 'done'],
    ]);
    expect(isUpToDate(caughtUp)).toBe(true);
    expect(isUpToDate(nextSteps(base))).toBe(false);
  });

  it('asks for a backup when there never was one, and when the last is over a week old', () => {
    const state = (daysSinceBackup: number | null) =>
      nextSteps({ ...base, available: new Set<NextStepId>(['back-up']), daysSinceBackup })[0]
        ?.state;
    expect(state(null)).toBe('todo');
    expect(state(BACKUP_MAX_DAYS + 1)).toBe('todo');
    expect(state(BACKUP_MAX_DAYS)).toBe('done');
    expect(state(0)).toBe('done');
  });

  it('shows the BAS job with how many days are left, and whether the quarter has ended', () => {
    const step = nextSteps({
      ...base,
      basPeriod: { label: 'Jul–Sep 2026', dueDate: d('2026-10-28'), ended: true },
    }).find((s) => s.id === 'bas-due');
    expect(step).toMatchObject({ daysToDue: -26, ready: true });
  });

  it('counts an empty list as up to date', () => {
    expect(isUpToDate([])).toBe(true);
  });
});

describe('overdue invoices (spec 128)', () => {
  it('is a job while an invoice is overdue, and not shown at all otherwise', () => {
    const only = {
      ...base,
      available: new Set<NextStepId>(['invoices-overdue']),
      overdueInvoices: { count: 1, cents: asCents(660000) },
    };
    expect(nextSteps(only)).toEqual([
      { id: 'invoices-overdue', state: 'todo', count: 1, cents: 660000 },
    ]);
    expect(nextSteps({ ...only, overdueInvoices: { count: 0, cents: asCents(0) } })).toEqual([]);
  });
});
