import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { parseCalendarDate } from '@shared/dates';
import { getHomeSummary } from './get-home-summary';
import { commitInvoiceFile } from './invoice-import';
import { invoicesView } from './invoices-view';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
  commitInvoiceFile(ctx, invoiceFixture('admin-dashboard-invoices-2026-11-22'));
});
afterEach(() => {
  ctx.close();
});

const row = (number: string) => invoicesView(ctx).rows.find((r) => r.number === number);

describe("customers' balances and overdue invoices (spec 128)", () => {
  it('an invoice not yet due is unpaid, with its due date', () => {
    expect(row('INV-1061')).toMatchObject({
      owing: 418000,
      status: { kind: 'unpaid', due: '2026-12-06' },
    });
  });

  it('one past its due date is overdue, by how many days', () => {
    expect(row('INV-1064')?.status).toEqual({ kind: 'overdue', days: 25 });
  });

  it('a credit note lowers what is owed on its invoice', () => {
    commitInvoiceFile(ctx, invoiceFixture('admin-dashboard-invoices-2026-11-25'));
    expect(row('INV-1062')?.owing).toBe(198000);
    expect(row('CN-0012')).toMatchObject({
      owing: 0,
      status: { kind: 'credit', forNumber: 'INV-1062' },
    });
  });

  it('adds up the bands, and Home has the job', () => {
    const view = invoicesView(ctx);
    expect(view.unpaid).toEqual({ cents: 1078000, count: 3 });
    expect(view.overdue).toEqual({ cents: 660000, count: 1 });
    expect(getHomeSummary(ctx).nextSteps).toContainEqual({
      id: 'invoices-overdue',
      state: 'todo',
      count: 1,
      cents: 660000,
    });
  });
});
