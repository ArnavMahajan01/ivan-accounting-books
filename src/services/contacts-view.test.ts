import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixtureText } from '../../tests/fixtures/westpac/fixtures';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { getContactByName } from '@data/contact-repository';
import { listWaitingLines } from '@data/review-repository';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { contactPage, contactsView } from './contacts-view';
import { commitImport, previewImport } from './import-file';
import { commitInvoiceFile } from './invoice-import';
import { matchDeposit } from './invoice-payments';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

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

const idOf = (name: string) => {
  const c = getContactByName(ctx.db, name);
  if (c === null) throw new Error(`no contact ${name}`);
  return c.id;
};
const pageOf = (name: string) => {
  const page = contactPage(ctx, idOf(name));
  if (page === null) throw new Error('no page');
  return page;
};
const pay = (words: string, number: string, cents: number) => {
  const line = listWaitingLines(ctx.db).find((l) => l.description.includes(words));
  if (line === undefined) throw new Error(`no line ${words}`);
  const paid = matchDeposit(ctx, {
    lineId: line.id,
    invoices: [{ number, amount: asCents(cents) }],
    leftover: null,
  });
  if (!paid.ok) throw new Error(paid.error);
};

describe('the contacts list (spec 123)', () => {
  it('gives customers what they owe and their oldest unpaid invoice, and where each came from', () => {
    const view = contactsView(ctx);
    expect(view.yearLabel).toBe('FY 2026–27');
    expect(view.rows.find((r) => r.name === 'Coastal Body Corporate')).toMatchObject({
      kind: 'customer',
      createdFrom: 'invoice',
      owing: 660000,
      oldestUnpaid: { kind: 'overdue', days: 25 },
    });
    expect(view.rows.find((r) => r.name === 'Smith Renovations')).toMatchObject({
      owing: 396000,
      oldestUnpaid: { kind: 'unpaid', due: '2026-12-12' },
    });
  });

  it('gives suppliers what was paid to them this financial year and their latest bank line', () => {
    const supplier = contactsView(ctx).rows.find(
      (r) => r.kind === 'supplier' && r.spentThisYear > 0,
    );
    expect(supplier?.lastLine).not.toBeNull();
    expect(supplier?.owing).toBe(0);
  });
});

describe('a contact’s page (spec 123)', () => {
  it('adds up: invoiced this year is paid plus still owed', () => {
    pay('INV 1062', 'INV-1063', 264000);
    const page = pageOf('Smith Renovations');
    expect(page.invoiced).toEqual({ cents: 396000, count: 1 });
    expect(page.paid).toEqual({ cents: 264000, count: 1 });
    expect(page.owing).toEqual({ cents: 132000, count: 1, nextDue: '2026-12-12' });
    expect(page.invoiced.cents).toBe(page.paid.cents + page.owing.cents);
    expect(page.payments).toEqual([
      expect.objectContaining({ invoiceNumber: 'INV-1063', amount: 264000 }),
    ]);
  });

  it('lists only their invoices, and their bank lines, newest first', () => {
    pay('INV 1061', 'INV-1061', 418000);
    const page = pageOf('Harbourview Developments');
    expect(page.invoices.map((r) => r.number)).toEqual(['INV-1061']);
    expect(page.owing.cents).toBe(0);
    expect(page.bankLines[0]).toMatchObject({ date: '2026-11-22', total: 418000 });
    const dates = page.bankLines.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(page.bankLines.every((r) => r.direction !== 'journal')).toBe(true);
  });

  it('a credit note lowers what was invoiced and what is owed alike', () => {
    commitInvoiceFile(ctx, invoiceFixture('admin-dashboard-invoices-2026-11-25'));
    const page = pageOf('Ellis Bathrooms');
    expect(page.invoiced.cents).toBe(page.paid.cents + page.owing.cents);
    expect(page.invoices.some((r) => r.kind === 'credit-note')).toBe(true);
  });

  it('has their details, and none for a contact that does not exist', () => {
    expect(pageOf('Coastal Body Corporate').contact).toMatchObject({
      email: 'strata@coastal.example.com',
      abn: '51824753556',
      createdFrom: 'invoice',
    });
    expect(contactPage(ctx, 'con_nobody')).toBeNull();
  });
});
