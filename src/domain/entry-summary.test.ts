import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { summariseEntry, type SummaryLine } from './entry-summary';

const line = (over: Omit<Partial<SummaryLine>, 'amount'> & { amount: number }): SummaryLine => ({
  accountId: 'acc_x',
  accountCode: '0000',
  accountName: 'X',
  isBank: false,
  gst: asCents(0),
  hasTaxCode: false,
  payee: null,
  ...over,
  amount: asCents(over.amount),
});
const bank = (amount: number, name = 'Business One ··4821') =>
  line({ amount, isBank: true, accountId: `acc_${name}`, accountCode: '1000', accountName: name });

describe('summariseEntry', () => {
  it('a purchase with GST: money out, for the account that carries the GST code', () => {
    const summary = summariseEntry([
      line({
        amount: 31105,
        gst: asCents(3110),
        hasTaxCode: true,
        accountId: 'acc_mat',
        accountCode: '5000',
        accountName: 'Materials and supplies',
        payee: 'Bunnings',
      }),
      line({ amount: 3110, accountId: 'acc_gst', accountCode: '2200', accountName: 'GST' }),
      { ...bank(-34215), payee: 'Bunnings' },
    ]);
    expect(summary).toEqual({
      direction: 'out',
      payee: 'Bunnings',
      account: { id: 'acc_mat', code: '5000', name: 'Materials and supplies' },
      beforeGst: 31105,
      gst: 3110,
      total: 34215,
    });
  });

  it('a sale with GST: money in, before GST $4,500.00, GST $450.00, total $4,950.00', () => {
    const summary = summariseEntry([
      { ...bank(495000), payee: 'Smith Renovations' },
      line({
        amount: -450000,
        gst: asCents(-45000),
        hasTaxCode: true,
        accountName: 'Sales',
        accountCode: '4000',
        payee: 'Smith Renovations',
      }),
      line({ amount: -45000, accountName: 'GST', accountCode: '2200' }),
    ]);
    expect(summary).toMatchObject({
      direction: 'in',
      payee: 'Smith Renovations',
      beforeGst: 450000,
      gst: 45000,
      total: 495000,
    });
    expect(summary.account?.name).toBe('Sales');
  });

  it('with no GST code, such as drawings, shows the largest account that is not a bank account', () => {
    const summary = summariseEntry([
      line({ amount: 340000, accountName: 'Owner drawings', accountCode: '3200' }),
      bank(-340000),
    ]);
    expect(summary).toMatchObject({
      direction: 'out',
      account: { name: 'Owner drawings' },
      beforeGst: 340000,
      gst: 0,
      total: 340000,
    });
  });

  it('a transfer between two of his accounts shows where the money went', () => {
    const summary = summariseEntry([
      bank(1000000, 'Business Cash Reserve ··7730'),
      bank(-1000000, 'Business One ··4821'),
    ]);
    expect(summary).toMatchObject({
      direction: 'transfer',
      payee: null,
      account: { name: 'Business Cash Reserve ··7730' },
      total: 1000000,
    });
  });

  it('an entry that touches no bank account is a journal', () => {
    const summary = summariseEntry([
      line({ amount: 5000, accountName: 'Depreciation' }),
      line({ amount: -5000, accountName: 'Plant and equipment' }),
    ]);
    expect(summary.direction).toBe('journal');
  });

  it('takes the first payee on the entry, and handles an entry with no lines', () => {
    expect(
      summariseEntry([
        line({ amount: 100 }),
        line({ amount: -100, payee: 'B' }),
        line({ amount: 1, payee: 'C' }),
      ]).payee,
    ).toBe('B');
    expect(summariseEntry([])).toEqual({
      direction: 'journal',
      payee: null,
      account: null,
      beforeGst: 0,
      gst: 0,
      total: 0,
    });
  });
});
