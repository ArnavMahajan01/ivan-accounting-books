import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { CHANGES, installBridge, settle } from '../test-bridge';
import { AccountantChangesPage } from './AccountantChangesPage';
import { GoogleStateProvider } from './google-state';

afterEach(cleanup);

async function show() {
  render(
    <BooksStateProvider>
      <GoogleStateProvider>
        <AccountantChangesPage />
      </GoogleStateProvider>
    </BooksStateProvider>,
  );
  await settle();
  await settle();
}

describe('Accountant changes (spec 117)', () => {
  it('checks the sheets when it opens, and says nothing changes until he accepts', async () => {
    const api = installBridge();
    await show();
    expect(api['changes.check']).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Nothing in your books changes until you accept/)).toBeTruthy();
  });

  it('shows each change with the line, was and now, and what accepting does', async () => {
    installBridge();
    await show();
    const sheet = screen.getByRole('region', { name: 'Transactions · Oct–Dec 2026' });
    expect(within(sheet).getByRole('heading').textContent).toBe(
      'Transactions · Oct–Dec 2026 2 waiting',
    );
    const first = within(sheet).getAllByRole('listitem')[0];
    expect(first?.textContent).toContain('15/10/2026 BUNNINGS 4532');
    expect(first?.textContent).toContain('row 18');
    expect(first?.querySelector('del')?.textContent).toBe('Materials and supplies');
    expect(first?.textContent).toContain(
      'What accepting does: Materials and supplies -$353.73, Tools and small equipment +$353.73',
    );
  });

  it('accepts one, and cannot accept an account the books do not have', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Accept: Account on row 18' }));
    await settle();
    expect(api['changes.accept']).toHaveBeenCalledWith({ id: 'chg_one' });
    expect(screen.getByRole('button', { name: 'Accept: Account on row 33' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByText(/"Drawings" is not an account in your books/)).toBeTruthy();
  });

  it('rejects one', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Reject: Account on row 33' }));
    await settle();
    expect(api['changes.reject']).toHaveBeenCalledWith({ id: 'chg_two' });
  });

  it('lists what was accepted or rejected', async () => {
    installBridge();
    await show();
    const done = screen.getByRole('region', { name: 'Done' });
    expect(done.textContent).toContain('TELSTRA BUSINESS, GST: FRE → GST');
    expect(done.textContent).toContain('Accepted');
  });

  it('says when there is nothing waiting', async () => {
    installBridge({
      'changes.list': vi.fn(() => Promise.resolve(ok({ ...CHANGES, waiting: [], done: [] }))),
    });
    await show();
    expect(screen.getByText(/No changes waiting/)).toBeTruthy();
  });
});
