import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { SettingsPage } from '../pages/SettingsPage';
import { installBridge, settle } from '../test-bridge';

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
