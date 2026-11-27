import { describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { parseInvoiceFile } from './invoice-exchange';

const fixture = (name: string) =>
  invoiceFixture(name.replace(/\.json$/, '') as Parameters<typeof invoiceFixture>[0]);

describe('the invoice exchange file (spec 125)', () => {
  it('reads the fixtures, leaving the quote out', () => {
    const first = parseInvoiceFile(fixture('admin-dashboard-invoices-2026-11-22.json'));
    if (!first.ok) throw new Error(`${first.error.field} ${first.error.problem}`);
    expect(first.value.quotes).toBe(1);
    expect(first.value.documents.map((d) => [d.number, d.version, d.total, d.gst])).toEqual([
      ['INV-1061', 1, 418000, 38000],
      ['INV-1062', 1, 264000, 24000],
      ['INV-1063', 1, 396000, 36000],
      ['INV-1064', 1, 660000, 60000],
    ]);
    const second = parseInvoiceFile(fixture('admin-dashboard-invoices-2026-11-25.json'));
    if (!second.ok) throw new Error(second.error.field);
    expect(second.value.documents.map((d) => [d.kind, d.number, d.version, d.creditFor])).toEqual([
      ['invoice', 'INV-1061', 1, null],
      ['invoice', 'INV-1064', 2, null],
      ['credit-note', 'CN-0012', 1, 'INV-1062'],
    ]);
  });

  it('names the field when something is wrong', () => {
    const good = JSON.parse(fixture('admin-dashboard-invoices-2026-11-22.json')) as {
      documents: { lines: { totalCents: number }[]; issueDate: string }[];
    };
    const wrongTotal = structuredClone(good);
    const line = wrongTotal.documents[1]?.lines[0];
    if (line !== undefined) line.totalCents += 1;
    expect(parseInvoiceFile(JSON.stringify(wrongTotal))).toEqual({
      ok: false,
      error: { field: 'documents.1.totals.totalCents', problem: 'is not the lines added up' },
    });
    const badDate = structuredClone(good);
    if (badDate.documents[0] !== undefined) badDate.documents[0].issueDate = '31/11/2026';
    expect(parseInvoiceFile(JSON.stringify(badDate))).toEqual({
      ok: false,
      error: { field: 'documents.0.issueDate', problem: 'is not a real date as YYYY-MM-DD' },
    });
  });

  it('refuses a file that is not one, or another format or version', () => {
    expect(parseInvoiceFile('not json')).toMatchObject({ ok: false, error: { field: 'file' } });
    expect(
      parseInvoiceFile(
        JSON.stringify({ format: 'other', version: 1, exportedAt: '', documents: [] }),
      ),
    ).toMatchObject({
      ok: false,
      error: { field: 'format' },
    });
    expect(
      parseInvoiceFile(
        JSON.stringify({
          format: 'accounting-books-invoices',
          version: 2,
          exportedAt: '',
          documents: [],
        }),
      ),
    ).toMatchObject({ ok: false, error: { field: 'version' } });
  });
});
