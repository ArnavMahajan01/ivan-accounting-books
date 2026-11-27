import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixtureText } from '../../tests/fixtures/westpac/fixtures';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { getAccountByCode } from '@data/account-repository';
import { listWaitingLines } from '@data/review-repository';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { plainRequest } from '@shared/reports';
import { getTrialBalance } from './get-trial-balance';
import { commitImport, previewImport } from './import-file';
import { commitInvoiceFile } from './invoice-import';
import { matchDeposit, suggestInvoices } from './invoice-payments';
import { invoicesView } from './invoices-view';
import { getReport } from './reports';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';
import { undoPost } from './undo-post';

let ctx: ReturnType<typeof createTestContext>;

beforeEach(() => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
  const prepared = previewImport(ctx, {
    fileName: 'demo-4.ofx',
    text: fixtureText('business-one-21-23-nov-2026-demo-4'),
  });
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.error));
  if (!commitImport(ctx, prepared.value).ok) throw new Error('not imported');
  commitInvoiceFile(ctx, invoiceFixture('admin-dashboard-invoices-2026-11-22'));
});
afterEach(() => {
  ctx.close();
});

const deposit = (words: string) => {
  const line = listWaitingLines(ctx.db).find((l) => l.description.includes(words));
  if (line === undefined) throw new Error(`no line ${words}`);
  return line;
};
const owing = (number: string) => invoicesView(ctx).rows.find((r) => r.number === number);
const balanced = () => {
  const tb = getTrialBalance(ctx, { from: null, to: null });
  return tb.ok && tb.value.balanced;
};
const gstToPay = () => {
  const r = getReport(ctx, {
    ...plainRequest('bas'),
    period: { choice: 'this-quarter', from: null, to: null },
  });
  if (!r.ok) throw new Error(r.error);
  return r.value.rows.find((row) => row.key === 'net')?.cells[0];
};

describe('matching a deposit to invoices (spec 129)', () => {
  it('suggests the invoice by its number in the description, and by the amount owed', () => {
    const line = deposit('INV 1061');
    expect(suggestInvoices(ctx, line.description, line.amount)).toEqual([
      {
        number: 'INV-1061',
        customer: 'Harbourview Developments',
        owing: 418000,
        because: 'number',
      },
    ]);
    expect(suggestInvoices(ctx, 'DEPOSIT 22NOV', asCents(264000))).toEqual([
      expect.objectContaining({ number: 'INV-1062', because: 'amount' }),
    ]);
  });

  it('a full payment marks the invoice paid, and the books balance', () => {
    const line = deposit('INV 1061');
    expect(
      matchDeposit(ctx, {
        lineId: line.id,
        invoices: [{ number: 'INV-1061', amount: asCents(418000) }],
        leftover: null,
      }).ok,
    ).toBe(true);
    expect(owing('INV-1061')).toMatchObject({
      owing: 0,
      status: { kind: 'paid', on: '2026-11-22' },
    });
    expect(listWaitingLines(ctx.db).some((l) => l.id === line.id)).toBe(false);
    expect(balanced()).toBe(true);
  });

  it('a part payment leaves the rest owing', () => {
    const line = deposit('INV 1062');
    matchDeposit(ctx, {
      lineId: line.id,
      invoices: [{ number: 'INV-1063', amount: asCents(264000) }],
      leftover: null,
    });
    expect(owing('INV-1063')?.owing).toBe(132000);
    expect(owing('INV-1063')?.status.kind).toBe('unpaid');
  });

  it('one deposit across several invoices, and an overpayment to an account', () => {
    const line = deposit('INV 1061');
    const other = getAccountByCode(ctx.db, '4100');
    if (other === null) throw new Error('no account');
    expect(
      matchDeposit(ctx, {
        lineId: line.id,
        invoices: [
          { number: 'INV-1062', amount: asCents(264000) },
          { number: 'INV-1063', amount: asCents(100000) },
        ],
        leftover: { accountId: other.id, taxCodeId: null },
      }).ok,
    ).toBe(true);
    expect(owing('INV-1062')?.owing).toBe(0);
    expect(owing('INV-1063')?.owing).toBe(296000);
    expect(balanced()).toBe(true);
  });

  it('refuses more than is owed, or parts that do not add up to the deposit', () => {
    const line = deposit('INV 1062');
    expect(
      matchDeposit(ctx, {
        lineId: line.id,
        invoices: [{ number: 'INV-1062', amount: asCents(300000) }],
        leftover: null,
      }),
    ).toEqual({ ok: false, error: 'more-than-owed' });
    expect(
      matchDeposit(ctx, {
        lineId: line.id,
        invoices: [{ number: 'INV-1063', amount: asCents(100000) }],
        leftover: null,
      }),
    ).toEqual({ ok: false, error: 'does-not-add-up' });
  });

  it('undo puts the deposit back in To review and the invoice owed again', () => {
    const line = deposit('INV 1061');
    matchDeposit(ctx, {
      lineId: line.id,
      invoices: [{ number: 'INV-1061', amount: asCents(418000) }],
      leftover: null,
    });
    expect(undoPost(ctx, [line.id]).ok).toBe(true);
    expect(owing('INV-1061')?.owing).toBe(418000);
    expect(balanced()).toBe(true);
  });

  it('on the cash basis, the invoice’s GST counts when it is paid', () => {
    const before = gstToPay();
    const line = deposit('INV 1061');
    matchDeposit(ctx, {
      lineId: line.id,
      invoices: [{ number: 'INV-1061', amount: asCents(418000) }],
      leftover: null,
    });
    // INV-1061 holds $380.00 GST, now reported in the quarter it was paid.
    const after = gstToPay();
    if (before?.kind !== 'money' || after?.kind !== 'money') throw new Error('no figure');
    expect(after.cents - before.cents).toBe(38000);
  });
});
