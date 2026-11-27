import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asCents } from '@shared/money';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { ToReviewPage } from '../pages/ToReviewPage';
import { date, installBridge, INVOICES, REVIEW, reviewLine, settle } from '../test-bridge';

afterEach(cleanup);

const deposit = reviewLine({
  id: 'stl_deposit',
  date: date('2026-11-22'),
  description: 'DEPOSIT K PATEL INV 1044',
  amount: asCents(231000),
  invoices: [
    { number: 'INV-1044', customer: 'K Patel', owing: asCents(231000), because: 'number' },
  ],
});

async function open() {
  const api = installBridge({
    'review.list': vi.fn(() => Promise.resolve(ok({ ...REVIEW, lines: [deposit], waiting: 1 }))),
    'invoices.list': vi.fn(() => Promise.resolve(ok(INVOICES))),
  });
  render(
    <BooksStateProvider>
      <ToReviewPage />
    </BooksStateProvider>,
  );
  await settle();
  return api;
}

describe('matching a deposit to an invoice in To review (spec 129)', () => {
  it('shows the invoice it pays, and Match posts it against that invoice', async () => {
    const api = await open();
    const row = screen.getByRole('row', { name: /DEPOSIT K PATEL/ });
    expect(row.textContent).toContain('Invoice INV-1044 · K Patel');
    expect(row.textContent).toContain('its number is in the description');
    await userEvent.click(
      within(row).getByRole('button', { name: 'Match DEPOSIT K PATEL INV 1044 to INV-1044' }),
    );
    await settle();
    expect(api['review.matchInvoices']).toHaveBeenCalledWith({
      lineId: 'stl_deposit',
      invoices: [{ number: 'INV-1044', amount: 231000 }],
      leftover: null,
    });
  });

  it('splits a deposit across invoices, and saves only when it adds up', async () => {
    const api = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Split across invoices…' }));
    await settle();
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('Left to split: $0.00 ✓');
    await userEvent.clear(within(sheet).getByRole('textbox', { name: 'Paying now on INV-1044' }));
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'Paying now on INV-1044' }),
      '1000',
    );
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'Paying now on INV-1039' }),
      '1310',
    );
    expect(sheet.textContent).toContain('Left to split: $0.00 ✓');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save split' }));
    await settle();
    expect(api['review.matchInvoices']).toHaveBeenCalledWith({
      lineId: 'stl_deposit',
      invoices: [
        { number: 'INV-1044', amount: 100000 },
        { number: 'INV-1039', amount: 131000 },
      ],
      leftover: null,
    });
  });
});
