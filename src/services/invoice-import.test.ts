import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { listAudit } from '@data/audit-repository';
import { getContactByName, getContactDetails } from '@data/contact-repository';
import { currentInvoice, listCurrentInvoices } from '@data/invoice-repository';
import { getJournalEntry } from '@data/journal-queries';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { plainRequest } from '@shared/reports';
import { getTrialBalance } from './get-trial-balance';
import { commitInvoiceFile, previewInvoiceFile } from './invoice-import';
import { lockPeriod } from './quarter-close';
import { getReport } from './reports';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
const day = (t: string): CalendarDate => {
  const p = parseCalendarDate(t, 'YYYY-MM-DD');
  if (!p.ok) throw new Error(t);
  return p.value;
};
const first = invoiceFixture('admin-dashboard-invoices-2026-11-22');
const second = invoiceFixture('admin-dashboard-invoices-2026-11-25');

beforeEach(() => {
  ctx = createTestContext();
  buildSampleBooks({ db: ctx.db }, day('2026-11-23'));
});
afterEach(() => {
  ctx.close();
});

function balanced() {
  const tb = getTrialBalance(ctx, { from: null, to: null });
  return tb.ok && tb.value.balanced;
}

function bas(choice: 'this-quarter' | 'last-quarter') {
  const r = getReport(ctx, { ...plainRequest('bas'), period: { choice, from: null, to: null } });
  if (!r.ok) throw new Error(r.error);
  return r.value.rows.find((row) => row.key === 'net')?.cells[0];
}

describe('bringing in invoices from the Admin Dashboard (spec 126)', () => {
  it('previews the new invoices, leaving the quote out, and saying which customers are new', () => {
    const preview = previewInvoiceFile(ctx, first, 'admin-dashboard-invoices-2026-11-22.json');
    if (!preview.ok) throw new Error(preview.error.field);
    expect(preview.value.added.map((d) => [d.number, d.customer, d.newCustomer])).toEqual([
      ['INV-1061', 'Harbourview Developments', false],
      ['INV-1062', 'Ellis Bathrooms', false],
      ['INV-1063', 'Smith Renovations', false],
      ['INV-1064', 'Coastal Body Corporate', true],
    ]);
    expect(preview.value).toMatchObject({ already: 0, quotes: 1, total: 1738000, gst: 158000 });
  });

  it('posts each through the posting service, saves the new customer, and the books balance', () => {
    expect(commitInvoiceFile(ctx, first)).toEqual({ ok: true, value: { added: 4, replaced: 0 } });
    expect(balanced()).toBe(true);
    const coastal = getContactByName(ctx.db, 'Coastal Body Corporate');
    expect(coastal?.createdFrom).toBe('invoice');
    expect(getContactDetails(ctx.db, coastal?.id ?? '')).toMatchObject({
      email: 'strata@coastal.example.com',
      abn: '51824753556',
    });
    const entry = getJournalEntry(ctx.db, currentInvoice(ctx.db, 'INV-1062')?.entryId ?? '');
    expect(entry).toMatchObject({
      sourceKind: 'invoice',
      sourceId: 'INV-1062',
      date: '2026-11-09',
    });
    expect(listAudit(ctx.db).filter((a) => a.kind === 'invoice.add')).toHaveLength(4);
  });

  it('importing the same file twice adds nothing', () => {
    commitInvoiceFile(ctx, first);
    const again = previewInvoiceFile(ctx, first, 'again.json');
    expect(again.ok && again.value).toMatchObject({ added: [], already: 4 });
    expect(commitInvoiceFile(ctx, first)).toEqual({ ok: false, error: 'nothing-new' });
    expect(listCurrentInvoices(ctx.db)).toHaveLength(4);
  });

  it('a newer version changes the same entry in place, and a credit note posts the other way', () => {
    commitInvoiceFile(ctx, first);
    const entryId = currentInvoice(ctx.db, 'INV-1064')?.entryId;
    const preview = previewInvoiceFile(ctx, second, 'second.json');
    expect(preview.ok && preview.value).toMatchObject({
      already: 1,
      replaced: [{ number: 'INV-1064', version: 2, total: 715000, wasTotal: 660000 }],
      added: [{ kind: 'credit-note', number: 'CN-0012', total: 66000 }],
    });
    expect(commitInvoiceFile(ctx, second)).toEqual({ ok: true, value: { added: 1, replaced: 1 } });
    const now = currentInvoice(ctx.db, 'INV-1064');
    expect(now).toMatchObject({ version: 2, total: 715000, entryId });
    const entry = getJournalEntry(ctx.db, entryId ?? '');
    expect(entry?.lines[0]?.amount).toBe(715000);
    expect(listAudit(ctx.db).some((a) => a.kind === 'entry.change' && a.rowId === entryId)).toBe(
      true,
    );
    expect(balanced()).toBe(true);
  });

  it('on the cash basis, an unpaid invoice is not in the BAS yet', () => {
    const before = bas('this-quarter');
    commitInvoiceFile(ctx, first);
    expect(bas('this-quarter')).toEqual(before);
  });

  it('refuses an invoice dated in a locked period', () => {
    expect(lockPeriod(ctx, day('2026-10-31')).ok).toBe(true);
    const preview = previewInvoiceFile(ctx, first, 'locked.json');
    expect(preview.ok && preview.value.refused).toEqual([{ number: 'INV-1064', reason: 'locked' }]);
  });
});
