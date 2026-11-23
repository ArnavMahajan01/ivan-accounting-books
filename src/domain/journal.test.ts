import { describe, expect, it } from 'vitest';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents } from '@shared/money';
import {
  isLocked,
  validateEntry,
  type EntryContext,
  type EntryInput,
  type EntryLineInput,
} from './journal';

function d(text: string): CalendarDate {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
}

const bank = 'acc_bank' as Id<'acc'>;
const sales = 'acc_sales' as Id<'acc'>;
const gstAccount = 'acc_gst' as Id<'acc'>;
const closed = 'acc_closed' as Id<'acc'>;
const gstCode = 'tax_gst' as Id<'tax'>;

const line = (
  accountId: Id<'acc'>,
  amount: number,
  gst = 0,
  taxCodeId: Id<'tax'> | null = null,
): EntryLineInput => ({
  accountId,
  amount: asCents(amount),
  taxCodeId,
  gst: asCents(gst),
  payeeId: null,
  memo: '',
});

// A sale of $1,100 including GST, paid into the bank (the convention in journal.ts).
const sale: EntryInput = {
  date: d('2026-11-23'),
  memo: 'A sale',
  sourceKind: 'manual',
  sourceId: null,
  lines: [line(bank, 110000), line(sales, -100000, -10000, gstCode), line(gstAccount, -10000)],
};

const context: EntryContext = {
  accounts: new Map([
    [bank, { active: true }],
    [sales, { active: true }],
    [gstAccount, { active: true }],
    [closed, { active: false }],
  ]),
  contacts: new Set(['con_supplier']),
  lockDate: d('2026-06-30'),
};

const withLines = (
  lines: readonly EntryLineInput[],
  over: Partial<EntryInput> = {},
): EntryInput => ({
  ...sale,
  ...over,
  lines,
});

describe('validateEntry', () => {
  it('passes a balanced entry with a GST line', () => {
    expect(validateEntry(sale, context)).toEqual([]);
  });

  it('passes a purchase with GST, and a transfer', () => {
    const purchase = withLines([
      line(sales, 50000, 5000, gstCode),
      line(gstAccount, 5000),
      line(bank, -55000),
    ]);
    expect(validateEntry(purchase, context)).toEqual([]);
    expect(validateEntry(withLines([line(bank, 200000), line(sales, -200000)]), context)).toEqual(
      [],
    );
  });

  it('refuses lines that do not sum to zero, and says by how much', () => {
    const out = withLines([line(bank, 110000), line(sales, -100000)]);
    expect(validateEntry(out, context)).toEqual([
      { code: 'lines-do-not-balance', difference: 10000 },
    ]);
    const other = withLines([line(bank, 100), line(sales, -250)]);
    expect(validateEntry(other, context)).toEqual([
      { code: 'lines-do-not-balance', difference: -150 },
    ]);
  });

  it('refuses fewer than two lines', () => {
    expect(validateEntry(withLines([]), context)).toEqual([{ code: 'too-few-lines' }]);
    expect(validateEntry(withLines([line(bank, 100)]), context)).toEqual([
      { code: 'too-few-lines' },
      { code: 'lines-do-not-balance', difference: 100 },
    ]);
  });

  it('refuses a line of zero', () => {
    expect(
      validateEntry(withLines([line(bank, 100), line(sales, -100), line(gstAccount, 0)]), context),
    ).toEqual([{ code: 'zero-line', line: 2 }]);
  });

  it('refuses GST with the opposite sign to its amount', () => {
    const wrong = withLines([
      line(bank, 110000),
      line(sales, -100000, 10000, gstCode),
      line(gstAccount, -10000),
    ]);
    expect(validateEntry(wrong, context)).toEqual([{ code: 'gst-sign', line: 1 }]);
  });

  it('refuses an inactive account and an account that does not exist, naming the line', () => {
    const entry = withLines([line(bank, 100), line(closed, -50), line('acc_nope', -50)]);
    expect(validateEntry(entry, context)).toEqual([
      { code: 'inactive-account', line: 1, accountId: closed },
      { code: 'unknown-account', line: 2, accountId: 'acc_nope' },
    ]);
  });

  it('refuses a payee that is not a contact, and accepts one that is', () => {
    const lines = (payeeId: string | null) => [{ ...line(bank, 100), payeeId }, line(sales, -100)];
    expect(validateEntry(withLines(lines('con_supplier')), context)).toEqual([]);
    expect(validateEntry(withLines(lines('con_ghost')), context)).toEqual([
      { code: 'unknown-payee', line: 0, payeeId: 'con_ghost' },
    ]);
  });

  it('refuses a date on or before the lock date, and allows the day after', () => {
    expect(validateEntry(withLines(sale.lines, { date: d('2026-06-30') }), context)).toEqual([
      { code: 'locked-period', lockDate: '2026-06-30' },
    ]);
    expect(validateEntry(withLines(sale.lines, { date: d('2026-06-01') }), context)).toEqual([
      { code: 'locked-period', lockDate: '2026-06-30' },
    ]);
    expect(validateEntry(withLines(sale.lines, { date: d('2026-07-01') }), context)).toEqual([]);
  });

  it('allows any date when nothing is locked', () => {
    expect(
      validateEntry(withLines(sale.lines, { date: d('2000-01-01') }), {
        ...context,
        lockDate: null,
      }),
    ).toEqual([]);
  });

  it('reports every problem at once', () => {
    const entry = withLines([line(closed, 100, -5)], { date: d('2026-01-01') });
    expect(validateEntry(entry, context).map((p) => p.code)).toEqual([
      'locked-period',
      'too-few-lines',
      'gst-sign',
      'inactive-account',
      'lines-do-not-balance',
    ]);
  });
});

describe('isLocked', () => {
  it('is true on and before the lock date only', () => {
    expect(isLocked(d('2026-06-30'), d('2026-06-30'))).toBe(true);
    expect(isLocked(d('2026-07-01'), d('2026-06-30'))).toBe(false);
    expect(isLocked(d('2026-07-01'), null)).toBe(false);
  });
});
