import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { SettingsPage } from '../pages/SettingsPage';
import { BANK_SETTINGS, installBridge, settle } from '../test-bridge';
import { attentionSentence } from '../pages/SettingsPage';

afterEach(cleanup);

async function show() {
  render(
    <BooksStateProvider>
      <SettingsPage />
    </BooksStateProvider>,
  );
  await settle();
}

describe('Settings, Business (spec 132)', () => {
  it('shows the business in two lines', async () => {
    installBridge();
    await show();
    const card = screen.getByRole('region', { name: 'Business' });
    expect(card.textContent).toContain('Harbour Lane Joinery Pty Ltd · ABN 51 824 753 556');
    expect(card.textContent).toContain('GST on a cash basis · BAS quarterly · Year from 1 July');
  });

  it('warns before the basis or frequency changes, then saves', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Change…' }));
    const sheet = screen.getByRole('dialog', { name: 'Business' });
    expect(within(sheet).queryByText(/worked out the new way/)).toBeNull();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Monthly' }));
    expect(within(sheet).getByText(/worked out the new way/)).toBeTruthy();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await settle();
    expect(api['business.change']).toHaveBeenCalledWith(
      expect.objectContaining({ basFrequency: 'monthly', abn: '51 824 753 556' }),
    );
    expect(screen.getByText('Saved.')).toBeTruthy();
  });

  it('says why it was not saved', async () => {
    installBridge({
      'business.change': vi.fn(() =>
        Promise.resolve(ok({ kind: 'refused' as const, reason: 'bad-abn' as const })),
      ),
    });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Change…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toBe(
      'That ABN is not a real one. Check its 11 digits.',
    );
  });
});

describe('Settings, status cards (spec 133)', () => {
  it('says what needs attention, and puts those cards first', async () => {
    installBridge({
      'bankAccounts.settings': vi.fn(() => Promise.resolve(ok({ ...BANK_SETTINGS, accounts: [] }))),
    });
    await show();
    expect(screen.getByRole('status').textContent).toContain('No bank accounts are set up.');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toBe('Bank accounts');
  });

  it('joins several problems in a sentence', () => {
    expect(attentionSentence(['google is not connected', 'no bank accounts are set up'])).toBe(
      'Google is not connected and no bank accounts are set up.',
    );
  });

  it('adds a bank account with its bank and last four digits', async () => {
    const api = installBridge();
    await show();
    const card = screen.getByRole('region', { name: 'Bank accounts' });
    expect(card.textContent).toContain('Business One ··4821 · Westpac');
    await userEvent.click(within(card).getByRole('button', { name: 'Add bank account…' }));
    const sheet = screen.getByRole('dialog', { name: 'Add a bank account' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'Card');
    await userEvent.type(within(sheet).getByRole('combobox', { name: 'Bank' }), 'CommBank');
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'Last four digits of the account number' }),
      '1234',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add' }));
    await settle();
    expect(api['bankAccounts.add']).toHaveBeenCalledWith({
      name: 'Card',
      bank: 'CommBank',
      lastFour: '1234',
      ledgerAccountId: 'acc_savings',
    });
    expect(api['bankAccounts.settings']).toHaveBeenCalledTimes(2);
  });

  it('asks before it stops using a bank account', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Stop using Business One' }));
    expect(api['bankAccounts.stop']).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Stop using' }),
    );
    await settle();
    expect(api['bankAccounts.stop']).toHaveBeenCalledWith({ id: 'bnk_one' });
  });

  it('changes the appearance at once', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    await settle();
    expect(api['appearance.set']).toHaveBeenCalledWith({ appearance: 'dark' });
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Dark' }).checked).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.click(screen.getByRole('radio', { name: 'Same as Mac' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('shows the books folder in Finder', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Show in Finder' }));
    expect(api['app.showBooksFolder']).toHaveBeenCalled();
  });
});
