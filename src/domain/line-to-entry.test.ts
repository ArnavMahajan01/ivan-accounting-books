import { describe, expect, it } from 'vitest';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents, sumCents, type Cents } from '@shared/money';
import { validateEntry, type EntryInput } from './journal';
import { leftToSplit, lineToEntry, type LinePart } from './line-to-entry';
import { simpleEntry, type SimpleEntryTax } from './simple-entry';

const date: CalendarDate = (() => {
  const parsed = parseCalendarDate('2026-11-04', 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
})();

const bank = 'acc_bank' as Id<'acc'>;
const gstAccount = 'acc_gst' as Id<'acc'>;
const materials = 'acc_mat' as Id<'acc'>;
const tools = 'acc_tools' as Id<'acc'>;
const office = 'acc_office' as Id<'acc'>;
const fees = 'acc_fees' as Id<'acc'>;
const sales = 'acc_sales' as Id<'acc'>;

const GST: SimpleEntryTax = { taxCodeId: 'tax_gst', treatment: 'taxable', rateBp: 1000 };
const FRE: SimpleEntryTax = { taxCodeId: 'tax_fre', treatment: 'gst-free', rateBp: 0 };
const INP: SimpleEntryTax = { taxCodeId: 'tax_inp', treatment: 'input-taxed', rateBp: 0 };
const NT: SimpleEntryTax = { taxCodeId: 'tax_nt', treatment: 'outside-gst', rateBp: 0 };

function build(amount: number, parts: LinePart[]) {
  return lineToEntry({
    line: { id: 'stl_1', date, description: 'BUNNINGS 4532', amount: asCents(amount) },
    bankLedgerAccountId: bank,
    parts,
    payeeId: null,
    gstAccountId: gstAccount,
  });
}

function entryOf(amount: number, parts: LinePart[]): EntryInput {
  const result = build(amount, parts);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const part = (accountId: Id<'acc'>, tax: SimpleEntryTax | null, gross: number): LinePart => ({
  accountId,
  tax,
  gross: asCents(gross),
});

const valid = (entry: EntryInput) =>
  validateEntry(entry, {
    accounts: new Map(
      [bank, gstAccount, materials, tools, office, fees, sales].map((id) => [id, { active: true }]),
    ),
    contacts: new Set(),
    lockDate: null,
  });

const gstOn = (entry: EntryInput, accountId: Id<'acc'>): Cents | undefined =>
  entry.lines.find((l) => l.accountId === accountId)?.gst;

describe('lineToEntry with one account', () => {
  it('money out with GST: the expense net, the GST credit, the bank out', () => {
    const entry = entryOf(-41260, [part(materials, GST, 41260)]);
    expect(entry.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      [materials, 37509, 3751],
      [gstAccount, 3751, 0],
      [bank, -41260, 0],
    ]);
    expect(valid(entry)).toEqual([]);
    expect(entry).toMatchObject({
      sourceKind: 'bank-line',
      sourceId: 'stl_1',
      memo: 'BUNNINGS 4532',
    });
  });

  it('money in with GST: the bank in, the sale net, the GST owed', () => {
    const entry = entryOf(330000, [part(sales, GST, 330000)]);
    expect(entry.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      [bank, 330000, 0],
      [sales, -300000, -30000],
      [gstAccount, -30000, 0],
    ]);
    expect(valid(entry)).toEqual([]);
  });

  it.each([
    ['GST-free', FRE],
    ['input taxed', INP],
    ['outside GST (BAS excluded)', NT],
  ])('a %s line has no GST line', (_name, tax) => {
    const entry = entryOf(-1500, [part(fees, tax, 1500)]);
    expect(entry.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      [fees, 1500, 0],
      [bank, -1500, 0],
    ]);
    expect(entry.lines[0]?.taxCodeId).toBe(tax.taxCodeId);
    expect(valid(entry)).toEqual([]);
  });

  it('a refund (money in to an expense account) reduces the expense and the GST paid', () => {
    const entry = entryOf(5500, [part(materials, GST, 5500)]);
    expect(entry.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      [bank, 5500, 0],
      [materials, -5000, -500],
      [gstAccount, -500, 0],
    ]);
    expect(valid(entry)).toEqual([]);
  });

  it('gives the same entry as simpleEntry, so posting a line and the sample books agree', () => {
    for (const [amount, tax] of [
      [-41260, GST],
      [330000, GST],
      [-1500, INP],
      [2000, null],
    ] as const) {
      const entry = entryOf(amount, [part(materials, tax, Math.abs(amount))]);
      const simple = simpleEntry({
        date,
        memo: 'BUNNINGS 4532',
        sourceKind: 'bank-line',
        sourceId: 'stl_1',
        payeeId: null,
        moneyAccountId: bank,
        direction: amount < 0 ? 'out' : 'in',
        gross: asCents(Math.abs(amount)),
        categoryAccountId: materials,
        tax,
        gstAccountId: gstAccount,
      });
      expect(entry).toEqual(simple);
    }
  });

  it('puts the payee on the part and the bank line, not the GST line', () => {
    const result = lineToEntry({
      line: { id: 'stl_1', date, description: 'X', amount: asCents(-1100) },
      bankLedgerAccountId: bank,
      parts: [part(materials, GST, 1100)],
      payeeId: 'con_bunnings',
      gstAccountId: gstAccount,
    });
    expect(result.ok && result.value.lines.map((l) => l.payeeId)).toEqual([
      'con_bunnings',
      null,
      'con_bunnings',
    ]);
  });
});

describe('lineToEntry split across accounts (spec 072)', () => {
  it('a 2-way split: one line per part, each with its own GST, one GST line for the total', () => {
    const entry = entryOf(-23645, [part(office, GST, 8645), part(tools, GST, 15000)]);
    expect(entry.lines.map((l) => [l.accountId, l.amount, l.gst])).toEqual([
      [office, 7859, 786],
      [tools, 13636, 1364],
      [gstAccount, 2150, 0],
      [bank, -23645, 0],
    ]);
    expect(valid(entry)).toEqual([]);
  });

  it('a 4-way split with mixed GST codes balances to the cent', () => {
    const parts = [
      part(office, GST, 1001),
      part(tools, GST, 3333),
      part(fees, INP, 250),
      part(materials, FRE, 1416),
    ];
    const entry = entryOf(-6000, parts);
    expect(sumCents(entry.lines.map((l) => l.amount))).toBe(0);
    expect(gstOn(entry, office)).toBe(91);
    expect(gstOn(entry, tools)).toBe(303);
    expect(gstOn(entry, fees)).toBe(0);
    expect(gstOn(entry, materials)).toBe(0);
    expect(entry.lines.find((l) => l.accountId === gstAccount)?.amount).toBe(394);
    expect(valid(entry)).toEqual([]);
  });

  it('never leaves a cent over, however the amounts round', () => {
    // Every split of 1 to 200 cents into two GST parts still balances exactly.
    for (let total = 2; total <= 200; total += 1) {
      for (let first = 1; first < total; first += 7) {
        const entry = entryOf(-total, [part(office, GST, first), part(tools, GST, total - first)]);
        expect(sumCents(entry.lines.map((l) => l.amount))).toBe(0);
      }
    }
  });

  it('refuses parts that do not add up to the line, or any part of nothing', () => {
    expect(build(-1000, [part(office, GST, 600), part(tools, GST, 300)])).toEqual({
      ok: false,
      error: 'parts-do-not-add-up',
    });
    expect(build(-1000, [part(office, GST, 1000), part(tools, GST, 0)])).toEqual({
      ok: false,
      error: 'part-not-positive',
    });
    expect(build(-1000, [])).toEqual({ ok: false, error: 'no-parts' });
  });

  it('says what is left to split', () => {
    expect(leftToSplit(asCents(-23645), [asCents(8645)])).toBe(15000);
    expect(leftToSplit(asCents(-23645), [asCents(8645), asCents(15000)])).toBe(0);
    expect(leftToSplit(asCents(1000), [asCents(1200)])).toBe(-200);
  });
});
