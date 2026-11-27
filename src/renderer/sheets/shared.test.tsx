import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { installBridge, PEOPLE, settle } from '../test-bridge';
import { GoogleStateProvider } from './google-state';
import { SharedSheetsPage } from './SharedSheetsPage';

afterEach(cleanup);

const connected = vi.fn(() =>
  Promise.resolve(ok({ kind: 'connected' as const, email: 'owner@example.com' })),
);

async function show() {
  render(
    <BooksStateProvider>
      <GoogleStateProvider>
        <SharedSheetsPage />
      </GoogleStateProvider>
    </BooksStateProvider>,
  );
  await settle();
  await settle();
}

describe('Shared sheets, by person (spec 115)', () => {
  it('says who can see how many sheets, with the role in each row, and the ones only he sees', async () => {
    installBridge({ 'google.getStatus': connected });
    await show();
    const person = screen.getByRole('region', { name: 'accountant@example.com' });
    expect(within(person).getByRole('heading').textContent).toBe(
      'accountant@example.com can see 2 sheets',
    );
    const role = within(person).getByRole('combobox', {
      name: 'What accountant@example.com can do with Transactions · Oct–Dec 2026',
    });
    expect((role as HTMLSelectElement).value).toBe('editor');
    const onlyYou = screen.getByRole('region', { name: 'Only you' });
    expect(onlyYou.textContent).toContain('BAS worksheet · Jul–Sep 2026');
  });

  it('changes a role right in the row', async () => {
    const api = installBridge({ 'google.getStatus': connected });
    await show();
    await userEvent.selectOptions(
      screen.getByRole('combobox', {
        name: 'What accountant@example.com can do with Profit and loss · Oct–Dec 2026',
      }),
      'commenter',
    );
    await settle();
    expect(api['sheets.changeRole']).toHaveBeenCalledWith({
      linkId: 'shl_pl',
      permissionId: 'perm-2',
      role: 'commenter',
    });
  });

  it('asks before stopping everything for a person, and says what stays', async () => {
    const api = installBridge({ 'google.getStatus': connected });
    await show();
    await userEvent.click(
      screen.getByRole('button', { name: 'Stop sharing everything with accountant@example.com' }),
    );
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain(
      'accountant@example.com will no longer be able to open any of your 2 sheets. The sheets stay in your Google Drive.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing everything' }));
    await settle();
    expect(api['sheets.unshareAll']).toHaveBeenCalledWith({ email: 'accountant@example.com' });
  });

  it('while Google is not connected, lists the sheets and says where to connect', async () => {
    installBridge({
      'sheets.people': vi.fn(() =>
        Promise.resolve(
          ok({ ...PEOPLE, people: [], onlyYou: [], problem: 'not-connected' as const }),
        ),
      ),
    });
    await show();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText('BAS worksheet · Jul–Sep 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share…' })).toHaveProperty('disabled', true);
  });
});

describe('sharing (spec 114)', () => {
  it('asks for the email and role, then shows the full email and role before sharing', async () => {
    const api = installBridge({ 'google.getStatus': connected });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Share…' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'bookkeeper@example.com');
    await userEvent.click(within(dialog).getByRole('radio', { name: /Editor/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    const check = screen.getByRole('alertdialog', { name: 'Check before sharing' });
    expect(check.textContent).toContain(
      'Share Profit and loss · Oct–Dec 2026 with bookkeeper@example.com as Editor.',
    );
    expect(api['sheets.share']).not.toHaveBeenCalled();
    await userEvent.click(within(check).getByRole('button', { name: 'Share' }));
    await settle();
    expect(api['sheets.share']).toHaveBeenCalledWith({
      linkId: 'shl_pl',
      email: 'bookkeeper@example.com',
      role: 'editor',
    });
    expect(
      screen.getAllByRole('status').some((s) => s.textContent.includes('Shared "Profit and loss')),
    ).toBe(true);
  });

  it('explains the editor role on the Transactions sheet as the columns that come back to him', async () => {
    installBridge({ 'google.getStatus': connected });
    await show();
    const row = within(screen.getByRole('region', { name: 'Only you' }));
    expect(row.getByText('BAS worksheet · Jul–Sep 2026')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Share…' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sheet' }), 'shl_tx');
    expect(screen.getByRole('dialog').textContent).toContain(
      'can change the Account, GST and Note columns. Changes come back to you to accept',
    );
  });
});

describe('ready formulas (spec 113)', () => {
  it('lists them and copies one to the clipboard', async () => {
    const api = installBridge({ 'google.getStatus': connected });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Ready formulas' }));
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Copy Change from last quarter' }));
    await settle();
    expect(api['app.copyText']).toHaveBeenCalledWith({ text: '=B3-C3' });
    expect(screen.getByRole('dialog').textContent).toContain('Copied "Change from last quarter"');
  });
});

describe('the Google Sheet inside the app (spec 118)', () => {
  it('offers Open here only when turned on, and shows the fallback when Google refuses', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    );
    const api = installBridge({
      'google.getStatus': connected,
      'sheetPanel.getSetting': vi.fn(() => Promise.resolve(ok({ on: true }))),
    });
    await show();
    await userEvent.click(
      screen.getByRole('button', { name: 'Open Transactions · Oct–Dec 2026 here' }),
    );
    await settle();
    expect(api['sheetPanel.open']).toHaveBeenCalledWith(
      expect.objectContaining({ linkId: 'shl_tx' }),
    );
    expect(screen.getByRole('status').textContent).toContain(
      'The sheet could not open inside the app',
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Open in Chrome' })[1] ?? document.body,
    );
    expect(api['sheets.open']).toHaveBeenCalledWith({ linkId: 'shl_tx' });
    await userEvent.click(screen.getByRole('button', { name: 'Shared sheets' }));
    expect(api['sheetPanel.close']).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('has no Open here while it is turned off', async () => {
    installBridge({ 'google.getStatus': connected });
    await show();
    expect(screen.queryByRole('button', { name: /here$/ })).toBeNull();
  });
});
