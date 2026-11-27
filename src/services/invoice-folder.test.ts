import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { parseCalendarDate } from '@shared/dates';
import { commitInvoiceFile, previewInvoiceFile } from './invoice-import';
import { linkedInvoiceFolder, mergeExchangeFiles, setInvoiceFolder } from './invoice-folder';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
});
afterEach(() => {
  ctx.close();
});

describe('the linked folder (spec 127)', () => {
  it('remembers the folder, and forgets it', () => {
    expect(linkedInvoiceFolder(ctx)).toBeNull();
    setInvoiceFolder(ctx, '/Users/someone/Admin Dashboard exports');
    expect(linkedInvoiceFolder(ctx)).toBe('/Users/someone/Admin Dashboard exports');
    setInvoiceFolder(ctx, null);
    expect(linkedInvoiceFolder(ctx)).toBeNull();
  });

  it('takes everything in the folder as one file, the same invoice once, and leaves out what is not a file', () => {
    const merged = mergeExchangeFiles([
      invoiceFixture('admin-dashboard-invoices-2026-11-22'),
      invoiceFixture('admin-dashboard-invoices-2026-11-25'),
      'not a file',
    ]);
    expect(merged.unreadable).toBe(1);
    const preview = previewInvoiceFile(ctx, merged.text, 'Admin Dashboard exports');
    if (!preview.ok) throw new Error(preview.error.field);
    // INV-1061 is in both files: once. INV-1064 versions 1 and 2: only version 2, the newest.
    expect(preview.value.added.map((d) => `${d.number} v${String(d.version)}`)).toEqual([
      'INV-1061 v1',
      'INV-1062 v1',
      'INV-1063 v1',
      'INV-1064 v2',
      'CN-0012 v1',
    ]);
    expect(commitInvoiceFile(ctx, merged.text)).toEqual({
      ok: true,
      value: { added: 5, replaced: 0 },
    });
  });
});
