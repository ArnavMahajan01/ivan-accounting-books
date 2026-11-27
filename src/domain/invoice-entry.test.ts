import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents, sumCents } from '@shared/money';
import { invoiceToEntry, type InvoiceAccounts } from './invoice-entry';

const CODES: Readonly<Record<string, Id<'tax'>>> = {
  GST: 'tax_gst',
  FRE: 'tax_fre',
  'N-T': 'tax_nt',
};
const accounts: InvoiceAccounts = {
  receivables: 'acc_ar',
  sales: 'acc_sales',
  gst: 'acc_gst',
  taxCode: (code) => CODES[code] ?? null,
};
const vanity = {
  description: 'Vanity units',
  gstCode: 'GST',
  total: asCents(198000),
  gst: asCents(18000),
};
const mirror = {
  description: 'Mirror cabinet',
  gstCode: 'GST',
  total: asCents(66000),
  gst: asCents(6000),
};
const invoice = {
  kind: 'invoice' as const,
  number: 'INV-1062',
  issueDate: '2026-11-09' as CalendarDate,
  lines: [vanity, mirror],
};

describe('an invoice as a journal entry (spec 126)', () => {
  it('receivables up by the total, sales by each line before GST, GST owed, and it balances', () => {
    const entry = invoiceToEntry(invoice, 'con_ellis', accounts);
    if (!entry.ok) throw new Error(entry.error);
    expect(entry.value.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      ['acc_ar', 264000, 0],
      ['acc_sales', -180000, -18000],
      ['acc_sales', -60000, -6000],
      ['acc_gst', -24000, 0],
    ]);
    expect(sumCents(entry.value.lines.map((l) => l.amount))).toBe(0);
    expect(entry.value).toMatchObject({
      sourceKind: 'invoice',
      sourceId: 'INV-1062',
      date: '2026-11-09',
    });
  });

  it('a credit note is the same the other way round', () => {
    const entry = invoiceToEntry(
      {
        ...invoice,
        kind: 'credit-note',
        number: 'CN-0012',
        lines: [mirror],
      },
      'con_ellis',
      accounts,
    );
    if (!entry.ok) throw new Error(entry.error);
    expect(entry.value.lines.map((l) => l.amount)).toEqual([-66000, 60000, 6000]);
  });

  it('a GST-free line has no GST, and an unknown GST code is refused', () => {
    const free = invoiceToEntry(
      {
        ...invoice,
        lines: [{ description: 'Export', gstCode: 'FRE', total: asCents(50000), gst: asCents(0) }],
      },
      'con_x',
      accounts,
    );
    expect(free.ok && free.value.lines.map((l) => l.accountId)).toEqual(['acc_ar', 'acc_sales']);
    expect(
      invoiceToEntry({ ...invoice, lines: [{ ...vanity, gstCode: 'XYZ' }] }, 'con_x', accounts),
    ).toEqual({ ok: false, error: 'unknown-gst-code' });
  });
});
