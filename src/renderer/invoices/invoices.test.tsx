import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { installBridge, INVOICES, settle } from '../test-bridge';
import { InvoicesPage } from './InvoicesPage';

afterEach(cleanup);

async function show() {
  render(
    <BooksStateProvider>
      <InvoicesPage />
    </BooksStateProvider>,
  );
  await settle();
}

describe('the Invoices page (specs 126, 128)', () => {
  it('shows unpaid, overdue and paid lately, and each invoice in words', async () => {
    installBridge();
    await show();
    expect(screen.getByText('Overdue').closest('div')?.textContent).toContain('$6,600.00');
    const rows = within(screen.getByRole('grid', { name: 'Invoices' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Unpaid · due 26/11/2026'),
      expect.stringContaining('Paid 15/11/2026'),
      expect.stringContaining('Overdue · 22 days'),
    ]);
  });

  it('previews a file in sentences, and adds it only on Import', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    const sheet = screen.getByRole('dialog', { name: 'Import invoices' });
    expect(sheet.textContent).toContain('2 new invoices, total $3,960.00 including $360.00 GST');
    expect(sheet.textContent).toContain('1 invoice already in your books, skipped');
    expect(sheet.textContent).toContain('INV-1041 was replaced by version 2');
    expect(sheet.textContent).toContain('1 quote is not imported');
    expect(sheet.textContent).toContain('K Patel (new contact)');
    expect(api['invoices.commit']).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Import 3 invoices' }));
    await settle();
    expect(api['invoices.commit']).toHaveBeenCalledWith({ previewId: 'pre_inv' });
    expect(screen.getByRole('status').textContent).toBe(
      'Added 3 invoices, updated 1 changed invoice.',
    );
  });

  it('says what is wrong with a file it cannot read', async () => {
    installBridge({
      'invoices.chooseAndPreview': vi.fn(() =>
        Promise.resolve(
          ok({
            kind: 'refused' as const,
            field: 'documents.1.totals.totalCents',
            problem: 'is not the lines added up',
          }),
        ),
      ),
    });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toContain(
      'documents.1.totals.totalCents is not the lines added up',
    );
  });

  it('says there are none yet', async () => {
    installBridge({
      'invoices.list': vi.fn(() => Promise.resolve(ok({ ...INVOICES, rows: [] }))),
    });
    await show();
    expect(screen.getByText(/No invoices yet/)).toBeTruthy();
  });
});
