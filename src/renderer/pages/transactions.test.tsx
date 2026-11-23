import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asCents } from '@shared/money';
import { err, ok } from '@shared/result';
import { DETAIL, installBridge, row, settle, TRANSACTIONS } from '../test-bridge';
import { TransactionsPage } from './TransactionsPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/transactions';
});

async function open() {
  render(<TransactionsPage />);
  await settle();
}
const grid = () => screen.getByRole('grid', { name: 'Transactions' });
const rows = () => within(grid()).getAllByRole('row').slice(1);
const lastListCall = (api: ReturnType<typeof installBridge>) => {
  const calls = vi.mocked(api['transactions.list']).mock.calls;
  return calls[calls.length - 1]?.[0];
};

describe('the transactions list', () => {
  it('shows each entry as a row: date, type, payee, account, before GST, GST and total', async () => {
    installBridge();
    await open();
    expect(screen.getByRole('heading', { level: 1, name: 'Transactions' })).not.toBeNull();
    const bunnings = rows()[0]?.textContent ?? '';
    expect(bunnings).toContain('18/11/2026');
    expect(bunnings).toContain('Bank line');
    expect(bunnings).toContain('Money out');
    expect(bunnings).toContain('Bunnings');
    expect(bunnings).toContain('Fixings and sundries');
    expect(bunnings).toContain('Materials and supplies');
    expect(bunnings).toContain('$311.05');
    expect(bunnings).toContain('$31.10');
    expect(bunnings).toContain('$342.15');
    const smith = rows()[1]?.textContent ?? '';
    expect(smith).toContain('Invoice payment');
    expect(smith).toContain('Money in');
    expect(smith).toContain('$4,950.00');
  });

  it('marks an entry in a locked period with the word Locked, not colour alone', async () => {
    installBridge();
    await open();
    expect(rows()[2]?.textContent).toContain('Locked');
    expect(rows()[0]?.textContent).not.toContain('Locked');
  });

  it('shows the count and the totals under the list', async () => {
    installBridge();
    await open();
    const totals = screen.getByText(/3 transactions/).closest('p');
    expect(totals?.textContent).toContain('Before GST $6,756.50');
    expect(totals?.textContent).toContain('GST $675.65');
    expect(totals?.textContent).toContain('Total $7,432.15');
  });

  it('shows a payee-less entry by its description', async () => {
    installBridge({
      'transactions.list': () =>
        Promise.resolve(
          ok({
            ...TRANSACTIONS,
            rows: [row({ id: 'ent_d', payee: null, memo: 'Owner drawings', direction: 'out' })],
            matching: 1,
          }),
        ),
    });
    await open();
    expect(rows()[0]?.textContent).toContain('Owner drawings');
  });

  it('asks for the last 12 months by default, a page of 100 at a time', async () => {
    const api = installBridge();
    await open();
    expect(lastListCall(api)).toEqual({ period: 'last-12-months', limit: 100, offset: 0 });
  });
});

describe('the filters', () => {
  it('filters by kind of transaction', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Kind of transaction' }),
      'money-in',
    );
    await settle();
    expect(lastListCall(api)).toMatchObject({ kind: 'money-in', offset: 0 });
    expect(screen.getByRole('button', { name: 'Clear filters' })).not.toBeNull();
  });

  it('filters by a ready-made period, and by dates he chooses', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dates' }), 'financial-year');
    await settle();
    expect(lastListCall(api)).toMatchObject({ period: 'financial-year' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dates' }), 'custom');
    await user.type(screen.getByLabelText('From date'), '2026-10-01');
    await user.type(screen.getByLabelText('To date'), '2026-10-31');
    await settle();
    expect(lastListCall(api)).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
    expect(lastListCall(api)).not.toHaveProperty('period');
  });

  it('filters by account, with the accounts grouped by type', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    const select = screen.getByRole('combobox', { name: 'Account' });
    expect(within(select).getByRole('group', { name: 'Expenses' })).not.toBeNull();
    expect(
      within(select).getByRole('option', { name: '5000 Materials and supplies' }),
    ).not.toBeNull();
    expect(within(select).queryByRole('option', { name: /Old account/ })).toBeNull();
    await user.selectOptions(select, 'acc_mat');
    await settle();
    expect(lastListCall(api)).toMatchObject({ accountId: 'acc_mat' });
  });

  it('searches once he stops typing, not on every key', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    const before = vi.mocked(api['transactions.list']).mock.calls.length;
    await user.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'bunnings');
    expect(vi.mocked(api['transactions.list']).mock.calls.length).toBe(before);
    await waitFor(() => {
      expect(lastListCall(api)).toMatchObject({ search: 'bunnings' });
    });
    expect(vi.mocked(api['transactions.list']).mock.calls.length).toBe(before + 1);
  });

  it('combines every filter in one request, and Clear filters puts them all back', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Kind of transaction' }),
      'money-out',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Account' }), 'acc_mat');
    await user.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'timber');
    await waitFor(() => {
      expect(lastListCall(api)).toMatchObject({
        kind: 'money-out',
        accountId: 'acc_mat',
        search: 'timber',
        period: 'last-12-months',
      });
    });
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0] as HTMLElement);
    await waitFor(() => {
      expect(lastListCall(api)).toEqual({ period: 'last-12-months', limit: 100, offset: 0 });
    });
    expect(
      screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search transactions' }).value,
    ).toBe('');
  });

  it('starts on the account it was opened for from the chart of accounts', async () => {
    window.location.hash = '#/transactions?account=acc_sales';
    const api = installBridge();
    await open();
    expect(lastListCall(api)).toMatchObject({ accountId: 'acc_sales' });
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Account' }).value).toBe(
      'acc_sales',
    );
  });

  it('shows an account total beside the totals when one account is chosen', async () => {
    installBridge({
      'transactions.list': () =>
        Promise.resolve(ok({ ...TRANSACTIONS, accountTotal: asCents(981240) })),
    });
    await open();
    expect(screen.getByText(/Account total/).textContent).toContain('$9,812.40');
  });
});

describe('paging', () => {
  const many = (offset: number) => ({ ...TRANSACTIONS, matching: 250, offset, limit: 100 });

  it('shows which rows are on screen, and moves a page at a time', async () => {
    const api = installBridge({
      'transactions.list': (input) => Promise.resolve(ok(many(input.offset ?? 0))),
    });
    const user = userEvent.setup();
    await open();
    expect(screen.getByText('Showing 1 to 100')).not.toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await settle();
    expect(lastListCall(api)).toMatchObject({ offset: 100 });
    expect(screen.getByText('Showing 101 to 200')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await settle();
    expect(screen.getByText('Showing 201 to 250')).not.toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: /Next/ }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await settle();
    expect(lastListCall(api)).toMatchObject({ offset: 100 });
  });

  it('goes back to the first page when a filter changes', async () => {
    const api = installBridge({
      'transactions.list': (input) => Promise.resolve(ok(many(input.offset ?? 0))),
    });
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await settle();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Kind of transaction' }),
      'money-in',
    );
    await settle();
    expect(lastListCall(api)).toMatchObject({ kind: 'money-in', offset: 0 });
  });

  it('has no paging when everything fits on one page', async () => {
    installBridge();
    await open();
    expect(screen.queryByRole('navigation', { name: 'Pages of transactions' })).toBeNull();
  });
});

describe('the panel beside the list', () => {
  it('opens when a row is clicked, with the entry’s lines, which balance, and its history', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    await user.click(within(rows()[0] as HTMLElement).getByText('Bunnings'));
    await settle();
    expect(vi.mocked(api['transactions.get'])).toHaveBeenCalledWith({ id: 'ent_bunnings' });
    const panel = screen.getByRole('complementary', { name: 'Bunnings' });
    expect(within(panel).getByText('What it did to the books')).not.toBeNull();
    const lines = within(panel).getByRole('table');
    expect(within(lines).getByText('Materials and supplies')).not.toBeNull();
    const totalsRow = within(lines).getByRole('row', { name: /Totals/ });
    const cells = within(totalsRow)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells).toEqual(['$342.15', '$342.15']);
    const history = within(panel).getByText('History').nextElementSibling;
    expect(history?.textContent).toContain('Posted');
    expect(history?.textContent).toContain('Changed');
    expect(history?.textContent).toContain(
      'Account changed from Tools and small equipment to Materials and supplies',
    );
  });

  it('opens with Enter on a row, and shows which row is open', async () => {
    installBridge();
    const user = userEvent.setup();
    await open();
    (rows()[1] as HTMLElement).focus();
    await user.keyboard('{Enter}');
    await settle();
    expect(screen.getByRole('complementary')).not.toBeNull();
    expect(rows()[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('closes with Escape, and gives focus back to the row', async () => {
    installBridge();
    const user = userEvent.setup();
    await open();
    const first = rows()[0] as HTMLElement;
    first.focus();
    await user.keyboard('{Enter}');
    await settle();
    expect(screen.getByRole('complementary')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(document.activeElement).toBe(first);
  });

  it('closes with its Close button', async () => {
    installBridge();
    const user = userEvent.setup();
    await open();
    await user.click(rows()[0] as HTMLElement);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('shows another entry when another row is clicked', async () => {
    const api = installBridge();
    const user = userEvent.setup();
    await open();
    await user.click(rows()[0] as HTMLElement);
    await settle();
    await user.click(rows()[1] as HTMLElement);
    await settle();
    expect(vi.mocked(api['transactions.get'])).toHaveBeenLastCalledWith({ id: 'ent_smith' });
  });

  it('says a locked entry is locked', async () => {
    installBridge({ 'transactions.get': () => Promise.resolve(ok({ ...DETAIL, locked: true })) });
    const user = userEvent.setup();
    await open();
    await user.click(rows()[2] as HTMLElement);
    await settle();
    expect(screen.getByText(/This period is locked/)).not.toBeNull();
  });

  it('says when the entry is gone, and when it cannot be read, with a way to try again', async () => {
    installBridge({ 'transactions.get': () => Promise.resolve(ok(null)) });
    const user = userEvent.setup();
    await open();
    await user.click(rows()[0] as HTMLElement);
    await settle();
    expect(screen.getByText(/This transaction no longer exists/)).not.toBeNull();
    cleanup();

    let fail = true;
    const api = installBridge({
      'transactions.get': () => Promise.resolve(fail ? err({ code: 'internal' }) : ok(DETAIL)),
    });
    await open();
    await user.click(rows()[0] as HTMLElement);
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('could not be read');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(vi.mocked(api['transactions.get']).mock.calls.length).toBe(2);
    expect(screen.getByText('What it did to the books')).not.toBeNull();
  });
});

describe('the list’s other states', () => {
  it('shows table-shaped rows while it loads', () => {
    installBridge({ 'transactions.list': () => new Promise(() => undefined) });
    render(<TransactionsPage />);
    expect(document.querySelectorAll('.table__skeleton-row').length).toBeGreaterThan(0);
  });

  it('says there are no transactions yet for empty books, and offers no filters to clear', async () => {
    installBridge({
      'transactions.list': () => Promise.resolve(ok({ ...TRANSACTIONS, rows: [], matching: 0 })),
    });
    await open();
    expect(screen.getByText(/No transactions yet/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('says nothing matches when filters leave nothing, and offers to clear them', async () => {
    const user = userEvent.setup();
    installBridge({
      'transactions.list': (input) =>
        Promise.resolve(
          ok(
            input.kind === 'transfers' ? { ...TRANSACTIONS, rows: [], matching: 0 } : TRANSACTIONS,
          ),
        ),
    });
    await open();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Kind of transaction' }),
      'transfers',
    );
    await settle();
    expect(screen.getByText('No transactions match these filters.')).not.toBeNull();
    await user.click(
      within(
        screen.getByText('No transactions match these filters.').closest('section') as HTMLElement,
      ).getByRole('button', { name: 'Clear filters' }),
    );
    await settle();
    expect(rows()).toHaveLength(3);
  });

  it('explains a date mistake, and an error, in plain words', async () => {
    installBridge({ 'transactions.list': () => Promise.resolve(err({ code: 'invalid-input' })) });
    await open();
    expect(screen.getByRole('alert').textContent).toContain('Check the dates');
    cleanup();
    installBridge({ 'transactions.list': () => Promise.resolve(err({ code: 'internal' })) });
    await open();
    expect(screen.getByRole('alert').textContent).toContain('could not be read');
    expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
  });

  it('copes with a very long description and payee', async () => {
    const long = 'Very long words '.repeat(30);
    installBridge({
      'transactions.list': () =>
        Promise.resolve(
          ok({ ...TRANSACTIONS, rows: [row({ payee: long, memo: long })], matching: 1 }),
        ),
    });
    await open();
    expect(rows()[0]?.textContent).toContain(long.trim());
  });
});
