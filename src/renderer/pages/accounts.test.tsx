import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { err, ok } from '@shared/result';
import { ACCOUNTS, installBridge, settle } from '../test-bridge';
import { AccountsPage } from './AccountsPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/accounts';
  installBridge();
});

async function open() {
  render(<AccountsPage />);
  await settle();
}

const groupNames = () =>
  [...document.querySelectorAll('.table__group th')].map((el) => el.textContent);
const rowNames = () =>
  within(screen.getByRole('grid', { name: 'Chart of accounts' }))
    .getAllByRole('row')
    .map((r) => r.textContent);

describe('the chart of accounts', () => {
  it('is grouped with his bank accounts first, then by type, and leaves out groups with nothing in them', async () => {
    await open();
    expect(groupNames()).toEqual([
      'Bank accounts',
      'Other assets',
      'Liabilities',
      'Income',
      'Expenses',
    ]);
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).not.toBeNull();
  });

  it('shows each account’s code, name, type, usual GST and balance, with a minus sign for a credit', async () => {
    await open();
    const rows = rowNames();
    const find = (text: string) =>
      rows.find((r) => r.includes(text) && !r.startsWith('Account')) ?? '';
    expect(find('Business One ··4821')).toContain('1000');
    expect(find('Business One ··4821')).toContain('$18,642.35');
    expect(find('2200')).toContain('-$3,184.20');
    expect(find('Sales')).toContain('GST');
    expect(find('Sales')).toContain('-$81,839.93');
    expect(find('Interest income')).toContain('Input taxed');
    expect(find('Materials and supplies')).toContain('$9,812.40');
  });

  it('is in code order inside each group', async () => {
    await open();
    const rows = rowNames();
    expect(rows.findIndex((r) => r.includes('Business One'))).toBeLessThan(
      rows.findIndex((r) => r.includes('Business Cash Reserve')),
    );
    expect(rows.findIndex((r) => r.includes('Sales'))).toBeLessThan(
      rows.findIndex((r) => r.includes('Interest income')),
    );
  });

  it('says the date it is as at, and what a minus sign means', async () => {
    await open();
    expect(screen.getByText(/As at 23\D11\D2026/)).not.toBeNull();
    expect(screen.getByText(/A minus sign means the account has a credit balance/)).not.toBeNull();
  });

  it('hides inactive accounts until he asks for them', async () => {
    const user = userEvent.setup();
    await open();
    expect(rowNames().some((r) => r.includes('Old account'))).toBe(false);
    await user.click(screen.getByRole('checkbox', { name: 'Show inactive accounts' }));
    expect(rowNames().some((r) => r.includes('Old account'))).toBe(true);
    expect(rowNames().find((r) => r.includes('Old account'))).toContain('Inactive');
  });

  it('offers the inactive filter only when there is an inactive account', async () => {
    installBridge({
      'accounts.list': () =>
        Promise.resolve(ok({ ...ACCOUNTS, accounts: ACCOUNTS.accounts.filter((a) => a.active) })),
    });
    await open();
    expect(screen.queryByRole('checkbox', { name: 'Show inactive accounts' })).toBeNull();
  });

  it('searches by name or code, in any capitals, and every word must match', async () => {
    const user = userEvent.setup();
    await open();
    const search = screen.getByRole('searchbox', { name: 'Search accounts' });
    await user.type(search, 'gst');
    expect(rowNames().filter((r) => r.includes('2200') || r.includes('GST'))).not.toHaveLength(0);
    expect(rowNames().some((r) => r.includes('Prepayments'))).toBe(false);
    await user.clear(search);
    await user.type(search, '5000');
    expect(rowNames().some((r) => r.includes('Materials and supplies'))).toBe(true);
    expect(rowNames().some((r) => r.includes('Sales'))).toBe(false);
    await user.clear(search);
    await user.type(search, 'business cash');
    expect(rowNames().some((r) => r.includes('Business Cash Reserve'))).toBe(true);
    expect(rowNames().some((r) => r.includes('Business One'))).toBe(false);
  });

  it('says so, and offers no table, when nothing matches', async () => {
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'zebra');
    expect(screen.getByText('No account matches "zebra".')).not.toBeNull();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('opens an account’s transactions with Enter on its row, or the link in it', async () => {
    const user = userEvent.setup();
    await open();
    const row = screen
      .getAllByRole('row')
      .find((r) => r.textContent.includes('GST') && r.textContent.includes('2200'));
    if (row === undefined) throw new Error('no row');
    row.focus();
    await user.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/transactions?account=acc_gst');
    const link = within(row).getByRole('link', { name: 'Transactions for GST' });
    expect(link.getAttribute('href')).toBe('#/transactions?account=acc_gst');
  });
});

describe('the chart’s other states', () => {
  it('shows table-shaped rows while it loads', () => {
    installBridge({ 'accounts.list': () => new Promise(() => undefined) });
    render(<AccountsPage />);
    expect(screen.getByLabelText('Loading accounts').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelectorAll('.table__skeleton-row').length).toBeGreaterThan(0);
  });

  it('says in plain words when it cannot be read', async () => {
    installBridge({ 'accounts.list': () => Promise.resolve(err({ code: 'internal' })) });
    await open();
    expect(screen.getByRole('alert').textContent).toContain('could not be read');
  });

  it('says there are no accounts yet for books that are not set up', async () => {
    installBridge({ 'accounts.list': () => Promise.resolve(ok({ ...ACCOUNTS, accounts: [] })) });
    await open();
    expect(screen.getByText(/No accounts yet/)).not.toBeNull();
  });

  it('copes with a very long account name', async () => {
    const long = 'A very long account name that goes on and on and on '.repeat(6);
    installBridge({
      'accounts.list': () =>
        Promise.resolve(
          ok({
            ...ACCOUNTS,
            accounts: [
              {
                ...(ACCOUNTS.accounts[0] ??
                  (() => {
                    throw new Error('x');
                  })()),
                name: long,
              },
            ],
          }),
        ),
    });
    await open();
    expect(rowNames().find((r) => r.includes('A very long'))).toContain(long.trim());
  });
});
