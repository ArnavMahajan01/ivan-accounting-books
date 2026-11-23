import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import type { Id } from '@shared/ids';
import { asCents } from '@shared/money';
import type { Account } from './accounts';
import { buildTrialBalance } from './balances';

const accId = (code: string): Id<'acc'> => `acc_${code}`;
const time = '2026-11-23T00:00:00.000Z' as Account['createdAt'];
const account = (code: string, name: string, type: Account['type']): Account => ({
  id: accId(code),
  code,
  name,
  type,
  parentId: null,
  defaultTaxCodeId: null,
  active: true,
  createdAt: time,
  updatedAt: time,
});
const accounts = [
  account('4000', 'Sales', 'income'),
  account('1000', 'Bank', 'asset'),
  account('2200', 'GST', 'liability'),
];
const total = (code: string, cents: number) => ({
  accountId: accId(code),
  total: asCents(cents),
});
const none = { from: null, to: null };

describe('buildTrialBalance', () => {
  it('is balanced, with no rows, for an empty book', () => {
    expect(buildTrialBalance(accounts, [], none)).toEqual({
      from: null,
      to: null,
      rows: [],
      totalDebit: 0,
      totalCredit: 0,
      balanced: true,
    });
  });

  it('puts a net debit in the debit column and a net credit in the credit column, in code order', () => {
    const tb = buildTrialBalance(
      accounts,
      [total('4000', -100000), total('1000', 110000), total('2200', -10000)],
      none,
    );
    expect(tb.rows.map((r) => [r.code, r.debit, r.credit])).toEqual([
      ['1000', 110000, 0],
      ['2200', 0, 10000],
      ['4000', 0, 100000],
    ]);
    expect([tb.totalDebit, tb.totalCredit, tb.balanced]).toEqual([110000, 110000, true]);
  });

  it('leaves out an account that nets to zero', () => {
    const tb = buildTrialBalance(
      accounts,
      [total('1000', 0), total('4000', -5), total('2200', 5)],
      none,
    );
    expect(tb.rows.map((r) => r.code)).toEqual(['2200', '4000']);
  });

  it('says plainly when debits and credits differ', () => {
    const tb = buildTrialBalance(accounts, [total('1000', 100), total('4000', -90)], none);
    expect([tb.totalDebit, tb.totalCredit, tb.balanced]).toEqual([100, 90, false]);
  });

  it('keeps the range it was built for', () => {
    const range = { from: '2026-07-01' as CalendarDate, to: '2026-09-30' as CalendarDate };
    expect(buildTrialBalance(accounts, [], range)).toMatchObject(range);
  });

  it('refuses a total for an account that does not exist', () => {
    expect(() => buildTrialBalance(accounts, [total('9999', 1)], none)).toThrow(RangeError);
  });
});
