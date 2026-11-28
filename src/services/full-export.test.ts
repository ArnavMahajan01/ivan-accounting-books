import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { parseCalendarDate } from '@shared/dates';
import { fullExport } from './full-export';
import { getTrialBalance } from './get-trial-balance';
import { commitInvoiceFile } from './invoice-import';
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

/** Splits CSV text into rows of cells, with quoted cells. Enough for the files this writes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"' && text.charAt(i + 1) === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  return rows;
}

const cents = (text: string) => (text === '' ? 0 : Math.round(Number(text) * 100));

describe('Export all data (spec 139)', () => {
  it('writes a README and a file for each part of the books', () => {
    expect(fullExport(ctx).map((f) => f.name)).toEqual([
      'README.txt',
      'accounts.csv',
      'entries.csv',
      'bank-accounts.csv',
      'contacts.csv',
      'invoices.csv',
      'rules.csv',
    ]);
  });

  it('adding the exported lines back up reproduces the trial balance', () => {
    const entries = fullExport(ctx).find((f) => f.name === 'entries.csv');
    if (entries === undefined) throw new Error('no entries');
    const [header, ...rows] = parseCsv(entries.text);
    const col = (name: string) => header?.indexOf(name) ?? -1;
    const byCode = new Map<string, number>();
    for (const r of rows) {
      const code = r[col('Account code')] ?? '';
      const net = cents(r[col('Debit')] ?? '') - cents(r[col('Credit')] ?? '');
      byCode.set(code, (byCode.get(code) ?? 0) + net);
    }
    const tb = getTrialBalance(ctx, { from: null, to: null });
    if (!tb.ok) throw new Error('tb');
    const fromTb = new Map(tb.value.rows.map((r) => [r.code, r.debit - r.credit]));
    for (const [code, net] of byCode) expect(fromTb.get(code) ?? 0, code).toBe(net);
    for (const [code, net] of fromTb) expect(byCode.get(code), code).toBe(net);
    expect([...byCode.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('has the invoices, contacts with details, and no cell that could run as a formula', () => {
    const files = new Map(fullExport(ctx).map((f) => [f.name, f.text]));
    expect(files.get('invoices.csv')).toContain('INV-1064,1,invoice,Coastal Body Corporate');
    expect(files.get('contacts.csv')).toContain('strata@coastal.example.com');
    for (const [name, csv] of files) {
      if (!name.endsWith('.csv')) continue;
      for (const r of parseCsv(csv)) {
        for (const c of r) expect(/^[=+@]/.test(c), `${name}: ${c}`).toBe(false);
      }
    }
  });
});
