import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asCents } from '@shared/money';
import { err, ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { ImportProvider } from '../import/ImportProvider';
import { BANK, BANK_ONE, BANK_RESERVE, date, installBridge, settle } from '../test-bridge';
import { BankPage } from './BankPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/bank';
  installBridge();
});

async function open() {
  render(
    <BooksStateProvider>
      <ImportProvider>
        <BankPage />
      </ImportProvider>
    </BooksStateProvider>,
  );
  await settle();
}

const table = () => screen.getByRole('grid', { name: 'Bank accounts' });

describe('the Bank page', () => {
  it('lists each account with what the books hold, the last statement and when it was', async () => {
    await open();
    const rows = within(table())
      .getAllByRole('row')
      .map((r) => r.textContent);
    expect(rows.find((r) => r.includes('Business One'))).toContain('$18,642.35');
    expect(rows.find((r) => r.includes('Business One'))).toContain('as at 20/11/2026');
    expect(rows.find((r) => r.includes('Cash Reserve'))).toContain('None imported yet');
    expect(rows.find((r) => r.includes('Cash Reserve'))).toContain('$25,000.00');
    expect(screen.getByRole('heading', { level: 1, name: 'Bank' })).not.toBeNull();
  });

  it('has one main action, Import file, and a drop zone that says so', async () => {
    await open();
    expect(document.querySelectorAll('.button--main')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Import file' })).not.toBeNull();
    expect(screen.getByText(/Drop a Westpac statement file here/)).not.toBeNull();
    // It says which kind of file it takes, so he does not have to guess.
    expect(screen.getByText(/must be an OFX file from Westpac Online Banking/)).not.toBeNull();
  });

  it('opens the Mac file chooser from Import file, and shows nothing when it is closed', async () => {
    const api = installBridge();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    expect(api['bank.chooseAndPreview']).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('points to the guide while no bank line has been imported, and not once one has', async () => {
    installBridge({
      'bank.list': () =>
        Promise.resolve(
          ok({ accounts: BANK.accounts.map((a) => ({ ...a, lastStatement: null })) }),
        ),
    });
    await open();
    expect(screen.getByText(/No bank lines yet/)).not.toBeNull();
    const link = screen.getByRole('link', { name: 'How to download one' });
    expect(link.getAttribute('href')).toBe('#/help/import-a-westpac-file');
    cleanup();
    installBridge();
    await open();
    expect(screen.queryByText(/No bank lines yet/)).toBeNull();
  });

  it('links the lines waiting for review to To review, with the count in words', async () => {
    installBridge({
      'bank.list': () =>
        Promise.resolve(
          ok({
            accounts: [
              { ...BANK_ONE, linesToReview: 24 },
              { ...BANK_RESERVE, linesToReview: 1 },
            ],
          }),
        ),
    });
    await open();
    expect(screen.getByRole('link', { name: '24 lines' }).getAttribute('href')).toBe('#/to-review');
    expect(screen.getByRole('link', { name: '1 line' })).not.toBeNull();
  });

  it('shows a sub-account under its account, and the digits when the name lacks them', async () => {
    installBridge({
      'bank.list': () =>
        Promise.resolve(
          ok({
            accounts: [
              BANK_ONE,
              {
                ...BANK_RESERVE,
                id: 'bnk_tax',
                name: 'Tax savings',
                lastFour: '9911',
                parentId: 'bnk_one',
                reconciledTo: date('2026-10-31'),
                balance: asCents(500),
              },
            ],
          }),
        ),
    });
    await open();
    const row = within(table()).getByText('Tax savings').closest('tr');
    expect(row?.textContent).toContain('··9911');
    expect(row?.textContent).toContain('to 31/10/2026');
    expect(within(table()).getByText('Tax savings').closest('.bank__name--sub')).not.toBeNull();
  });

  it('says so when there are no bank accounts, and when they cannot be read', async () => {
    installBridge({ 'bank.list': () => Promise.resolve(ok({ accounts: [] })) });
    await open();
    expect(screen.getByText(/No bank accounts yet/)).not.toBeNull();
    cleanup();
    installBridge({ 'bank.list': () => Promise.resolve(err({ code: 'internal' as const })) });
    await open();
    expect(screen.getByRole('alert').textContent).toContain('could not be read');
  });
});

describe('taking an import back', () => {
  const last = {
    batchId: 'imp_last',
    fileName: 'Westpac_4821_9-20Nov2026.ofx',
    added: 7,
    period: { from: date('2026-11-09'), to: date('2026-11-20') },
  };
  const withLast = (over: Parameters<typeof installBridge>[0] = {}) =>
    installBridge({
      'bank.list': () =>
        Promise.resolve(
          ok({ accounts: [{ ...BANK_ONE, undoableImport: last, linesToReview: 7 }, BANK_RESERVE] }),
        ),
      ...over,
    });

  it('lists the file imported last for the account, with an Undo import button for it', async () => {
    withLast();
    await open();
    const section = screen.getByRole('region', { name: 'Last import' });
    expect(section.textContent).toContain(
      'Business One ··4821: Westpac_4821_9-20Nov2026.ofx, 7 lines added, from 09/11/2026 to 20/11/2026.',
    );
    expect(
      within(section).getByRole('button', { name: 'Undo import of Westpac_4821_9-20Nov2026.ofx' }),
    ).not.toBeNull();
    // Still one main action on the page.
    expect(document.querySelectorAll('.button--main')).toHaveLength(1);
  });

  it('shows nothing when there is no import that can be taken back', async () => {
    await open();
    expect(screen.queryByRole('region', { name: 'Last import' })).toBeNull();
  });

  it('asks first, says what will change, and does nothing when it is cancelled', async () => {
    const api = withLast();
    await open();
    await userEvent.click(screen.getByRole('button', { name: /^Undo import of/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Undo this import?' });
    expect(dialog.textContent).toContain(
      'The 7 lines from Westpac_4821_9-20Nov2026.ofx will leave To review. The file stays where it is, and you can import it again.',
    );
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api['bank.undoImport']).not.toHaveBeenCalled();
  });

  it('takes the import back when confirmed, says how many lines left, and asks for the new figures', async () => {
    const api = withLast();
    await open();
    await userEvent.click(screen.getByRole('button', { name: /^Undo import of/ }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Undo import' }),
    );
    await settle();
    expect(api['bank.undoImport']).toHaveBeenCalledWith({ batchId: 'imp_last' });
    expect(screen.getByRole('status').textContent).toBe(
      '3 lines removed from To review. You can import Westpac_4821_14-20Nov2026.ofx again.',
    );
    // The table and the sidebar's count are asked for again.
    expect(vi.mocked(api['bank.list']).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(api['review.getCount']).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('says why in a sentence when it can no longer be taken back', async () => {
    withLast({
      'bank.undoImport': () =>
        Promise.resolve(ok({ kind: 'refused' as const, reason: 'lines-already-used' as const })),
    });
    await open();
    await userEvent.click(screen.getByRole('button', { name: /^Undo import of/ }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Undo import' }),
    );
    await settle();
    expect(screen.getByRole('alert').textContent).toBe(
      'Some of its lines have already been dealt with, so it can no longer be taken back.',
    );
  });

  it('says nothing was changed when the bridge fails', async () => {
    withLast({ 'bank.undoImport': () => Promise.resolve(err({ code: 'internal' as const })) });
    await open();
    await userEvent.click(screen.getByRole('button', { name: /^Undo import of/ }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Undo import' }),
    );
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('nothing was changed');
  });
});
