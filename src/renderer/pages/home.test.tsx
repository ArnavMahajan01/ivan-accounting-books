import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { err, ok } from '@shared/result';
import type { NextStep } from '@shared/views';
import { date, HOME, installBridge, settle } from '../test-bridge';
import { HomePage } from './HomePage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/home';
});

describe('Home with books that have entries', () => {
  it('shows the four numbers from the wireframe, each opening the page that explains it', async () => {
    installBridge();
    render(<HomePage />);
    await settle();
    const numbers = screen.getByRole('region', { name: 'Numbers' });
    const link = (name: RegExp) => within(numbers).getByRole('link', { name });
    expect(link(/Bank balance/).textContent).toContain('$43,642.35');
    expect(link(/Bank balance/).textContent).toContain('2 accounts');
    expect(link(/Bank balance/).getAttribute('href')).toBe('#/accounts');
    expect(link(/Lines to review/).textContent).toContain('none waiting');
    expect(link(/Lines to review/).getAttribute('href')).toBe('#/to-review');
    expect(link(/GST owing, Oct–Dec 2026/).textContent).toContain('$3,184.20');
    expect(link(/Profit, FY 2026–27/).textContent).toContain('$42,453.50');
    expect(link(/Profit, FY 2026–27/).textContent).toContain('since 01/07/2026');
  });

  it('says one account in the singular, and gives the oldest line waiting', async () => {
    installBridge({
      'home.getSummary': () =>
        Promise.resolve(
          ok({
            ...HOME,
            bank: { balance: asCents(500), accountCount: 1 },
            linesToReview: { count: 37, oldest: date('2026-11-01') },
          }),
        ),
    });
    render(<HomePage />);
    await settle();
    expect(screen.getByRole('link', { name: /Bank balance/ }).textContent).toContain('1 account');
    expect(screen.getByRole('link', { name: /Bank balance/ }).textContent).not.toContain(
      '1 accounts',
    );
    expect(screen.getByRole('link', { name: /Lines to review/ }).textContent).toContain(
      'oldest 01/11/2026',
    );
  });

  it('shows a minus sign, not just colour, for a negative figure', async () => {
    installBridge({
      'home.getSummary': () =>
        Promise.resolve(ok({ ...HOME, profit: { ...HOME.profit, amount: asCents(-120000) } })),
    });
    render(<HomePage />);
    await settle();
    expect(screen.getByRole('link', { name: /Profit/ }).textContent).toContain('-$1,200.00');
  });

  it('says he is up to date when there are no jobs, instead of an empty box', async () => {
    installBridge();
    render(<HomePage />);
    await settle();
    const todo = screen.getByRole('region', { name: 'To do' });
    expect(within(todo).getByText('You are up to date.')).not.toBeNull();
    expect(within(todo).queryByRole('button')).toBeNull();
  });

  it('shows each job with one button that opens its page, and ticks the jobs that are done', async () => {
    const steps: NextStep[] = [
      { id: 'review-lines', state: 'todo', count: 37, oldest: date('2026-11-01') },
      {
        id: 'reconcile',
        state: 'todo',
        accountName: 'Business One ··4821',
        statementDate: date('2026-11-13'),
        statementBalance: asCents(1864235),
      },
      { id: 'back-up', state: 'todo', daysSince: 9 },
      {
        id: 'bas-due',
        state: 'todo',
        periodLabel: 'Oct–Dec 2026',
        dueDate: date('2027-02-28'),
        daysToDue: 97,
        ready: false,
      },
      { id: 'accountant-changes', state: 'done', count: 0 },
    ];
    installBridge({
      'home.getSummary': () => Promise.resolve(ok({ ...HOME, nextSteps: steps, upToDate: false })),
    });
    const user = userEvent.setup();
    render(<HomePage />);
    await settle();
    const todo = screen.getByRole('region', { name: 'To do' });
    expect(within(todo).getAllByRole('listitem')).toHaveLength(5);
    expect(within(todo).getByText('Review 37 bank lines')).not.toBeNull();
    expect(within(todo).getByLabelText('Done')).not.toBeNull();
    expect(within(todo).queryByText('You are up to date.')).toBeNull();
    await user.click(within(todo).getByRole('button', { name: 'Review' }));
    expect(window.location.hash).toBe('#/to-review');
    await user.click(within(todo).getByRole('button', { name: 'Open worksheet' }));
    expect(window.location.hash).toBe('#/reports');
  });

  it('has Import file as its one main action, switched off until it exists', async () => {
    installBridge();
    render(<HomePage />);
    await settle();
    const main = screen.getByRole('button', { name: 'Import file' });
    expect((main as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelectorAll('.button--main')).toHaveLength(1);
  });
});

describe('Home’s warnings', () => {
  it('shows nothing when the books are well', async () => {
    installBridge();
    render(<HomePage />);
    await settle();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says plainly when the books do not balance, and when the file has a problem', async () => {
    installBridge({
      'home.getSummary': () =>
        Promise.resolve(ok({ ...HOME, warnings: ['out-of-balance', 'integrity-failed'] })),
    });
    render(<HomePage />);
    await settle();
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts[0]).toContain('Your books do not balance');
    expect(alerts[1]).toContain('The file that holds your books has a problem');
  });
});

describe('Home’s other states', () => {
  it('shows a placeholder, not a blank page, while it loads', () => {
    installBridge({ 'home.getSummary': () => new Promise(() => undefined) });
    render(<HomePage />);
    expect(screen.getByLabelText('Loading Home').getAttribute('aria-busy')).toBe('true');
  });

  it('says in plain words when it cannot be read', async () => {
    installBridge({ 'home.getSummary': () => Promise.resolve(err({ code: 'internal' })) });
    render(<HomePage />);
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('Home could not be read');
    expect(screen.queryByRole('region', { name: 'Numbers' })).toBeNull();
  });

  it('shows the getting-started list for books with no entries, and no numbers', async () => {
    installBridge({ 'home.getSummary': () => Promise.resolve(ok({ ...HOME, brandNew: true })) });
    render(<HomePage />);
    await settle();
    expect(screen.getByRole('heading', { name: 'Getting started' })).not.toBeNull();
    expect(screen.queryByRole('region', { name: 'Numbers' })).toBeNull();
  });
});
