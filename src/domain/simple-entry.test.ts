import { describe, expect, it } from 'vitest';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents, sumCents } from '@shared/money';
import { basContributions } from './bas-labels';
import { simpleEntry, type SimpleEntryInput, type SimpleEntryTax } from './simple-entry';

const date: CalendarDate = (() => {
  const parsed = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
})();

const bank = 'acc_bank' as Id<'acc'>;
const other = 'acc_other' as Id<'acc'>;
const gstAccount = 'acc_gst' as Id<'acc'>;
const taxable: SimpleEntryTax = {
  taxCodeId: 'tax_gst',
  treatment: 'taxable',
  rateBp: 1000,
};
const free: SimpleEntryTax = {
  taxCodeId: 'tax_fre',
  treatment: 'gst-free',
  rateBp: 0,
};
const inputTaxed: SimpleEntryTax = {
  taxCodeId: 'tax_inp',
  treatment: 'input-taxed',
  rateBp: 0,
};

function entry(over: Partial<SimpleEntryInput>) {
  return simpleEntry({
    date,
    memo: 'x',
    sourceKind: 'manual',
    sourceId: null,
    payeeId: null,
    moneyAccountId: bank,
    direction: 'out',
    gross: asCents(55000),
    categoryAccountId: other,
    tax: taxable,
    gstAccountId: gstAccount,
    ...over,
  });
}

const view = (e: ReturnType<typeof entry>) =>
  e.lines.map((l) => [l.accountId, l.amount, l.gst, l.taxCodeId]);

describe('simpleEntry', () => {
  it('money out with GST: the category in debit at net, the GST account in debit, the bank in credit', () => {
    expect(view(entry({}))).toEqual([
      [other, 50000, 5000, 'tax_gst'],
      [gstAccount, 5000, 0, null],
      [bank, -55000, 0, null],
    ]);
  });

  it('money in with GST: the bank in debit, the category in credit at net, the GST account in credit', () => {
    expect(view(entry({ direction: 'in', gross: asCents(110000) }))).toEqual([
      [bank, 110000, 0, null],
      [other, -100000, -10000, 'tax_gst'],
      [gstAccount, -10000, 0, null],
    ]);
  });

  it('a GST-free sale has no GST line, and keeps its tax code', () => {
    expect(view(entry({ direction: 'in', gross: asCents(380000), tax: free }))).toEqual([
      [bank, 380000, 0, null],
      [other, -380000, 0, 'tax_fre'],
    ]);
  });

  it('an input-taxed expense, such as a bank fee, has no GST line', () => {
    expect(view(entry({ gross: asCents(1000), tax: inputTaxed }))).toEqual([
      [other, 1000, 0, 'tax_inp'],
      [bank, -1000, 0, null],
    ]);
  });

  it('with no tax at all, such as a transfer or drawings, is two plain lines', () => {
    expect(view(entry({ gross: asCents(1000000), tax: null }))).toEqual([
      [other, 1000000, 0, null],
      [bank, -1000000, 0, null],
    ]);
    expect(view(entry({ direction: 'in', gross: asCents(1500000), tax: null }))).toEqual([
      [bank, 1500000, 0, null],
      [other, -1500000, 0, null],
    ]);
  });

  it('leaves out a GST line that would be zero', () => {
    expect(view(entry({ gross: asCents(5) }))).toEqual([
      [other, 5, 0, 'tax_gst'],
      [bank, -5, 0, null],
    ]);
  });

  it('keeps the payee on the money and category lines, but not on the GST line', () => {
    const e = entry({ payeeId: 'con_bunnings' });
    expect(e.lines.map((l) => l.payeeId)).toEqual(['con_bunnings', null, 'con_bunnings']);
  });

  it('always sums to zero, and the GST on the lines equals the GST line, for every amount', () => {
    for (const direction of ['in', 'out'] as const) {
      for (const tax of [taxable, free, inputTaxed, null]) {
        for (let cents = 1; cents <= 2500; cents += 1) {
          const e = entry({ direction, tax, gross: asCents(cents) });
          expect(sumCents(e.lines.map((l) => l.amount)), `${direction} ${String(cents)}`).toBe(0);
          const onLines = sumCents(e.lines.map((l) => l.gst));
          const gstLine = e.lines.find((l) => l.accountId === gstAccount);
          expect(gstLine?.amount ?? 0).toBe(onLines);
        }
      }
    }
  });

  it('feeds the BAS labels the way the ATO describes: a sale adds G1 and 1A, a purchase adds 1B', () => {
    const sale = entry({ direction: 'in', gross: asCents(110000) });
    const saleLine = sale.lines[1];
    expect(
      saleLine &&
        basContributions({
          accountType: 'income',
          treatment: 'taxable',
          amount: saleLine.amount,
          gst: saleLine.gst,
        }),
    ).toEqual([
      { label: 'G1', cents: 110000 },
      { label: '1A', cents: 10000 },
    ]);
    const purchase = entry({});
    const purchaseLine = purchase.lines[0];
    expect(
      purchaseLine &&
        basContributions({
          accountType: 'expense',
          treatment: 'taxable',
          amount: purchaseLine.amount,
          gst: purchaseLine.gst,
        }),
    ).toEqual([{ label: '1B', cents: 5000 }]);
  });

  it('refuses an amount of zero or less', () => {
    expect(() => entry({ gross: asCents(0) })).toThrow(RangeError);
    expect(() => entry({ gross: asCents(-5) })).toThrow(RangeError);
  });
});
