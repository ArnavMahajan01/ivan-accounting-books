import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import type { AccountType, TaxTreatment } from '@shared/kinds';
import { basContributions } from './bas-labels';

const line = (accountType: AccountType, treatment: TaxTreatment, amount: number, gst = 0) => ({
  accountType,
  treatment,
  amount: asCents(amount),
  gst: asCents(gst),
});

describe('basContributions', () => {
  it('a taxable sale of $1,100 with GST feeds G1 with the whole $1,100 and 1A with $100', () => {
    expect(basContributions(line('income', 'taxable', -100000, -10000))).toEqual([
      { label: 'G1', cents: 110000 },
      { label: '1A', cents: 10000 },
    ]);
  });

  it('a taxable purchase of $550 with GST feeds 1B with $50, and not G1', () => {
    expect(basContributions(line('expense', 'taxable', 50000, 5000))).toEqual([
      { label: '1B', cents: 5000 },
    ]);
  });

  it('a GST-free sale feeds G1 only', () => {
    expect(basContributions(line('income', 'gst-free', -80000))).toEqual([
      { label: 'G1', cents: 80000 },
    ]);
  });

  it('an input-taxed sale feeds G1 only', () => {
    expect(basContributions(line('income', 'input-taxed', -1500))).toEqual([
      { label: 'G1', cents: 1500 },
    ]);
  });

  it('a transfer between the business accounts feeds nothing', () => {
    expect(basContributions(line('asset', 'outside-gst', 200000))).toEqual([]);
    expect(basContributions(line('asset', 'outside-gst', -200000))).toEqual([]);
  });

  it('a refund of a taxable sale takes G1 and 1A back off, by the same amounts', () => {
    expect(basContributions(line('income', 'taxable', 100000, 10000))).toEqual([
      { label: 'G1', cents: -110000 },
      { label: '1A', cents: -10000 },
    ]);
  });

  it('a refund of a taxable purchase takes 1B back off', () => {
    expect(basContributions(line('expense', 'taxable', -50000, -5000))).toEqual([
      { label: '1B', cents: -5000 },
    ]);
  });

  it('purchases with no GST, and purchases that are not taxable, feed nothing', () => {
    expect(basContributions(line('expense', 'input-taxed', 1500))).toEqual([]);
    expect(basContributions(line('expense', 'gst-free', 9900))).toEqual([]);
    expect(basContributions(line('expense', 'outside-gst', 120000))).toEqual([]);
    expect(basContributions(line('expense', 'taxable', 0, 0))).toEqual([]);
  });

  it('income outside GST, such as a loan or capital put in, feeds nothing', () => {
    expect(basContributions(line('income', 'outside-gst', -5000))).toEqual([]);
  });

  it('the bank, GST, loan and equity lines of an entry feed nothing', () => {
    expect(basContributions(line('asset', 'outside-gst', 110000))).toEqual([]);
    expect(basContributions(line('liability', 'outside-gst', -10000))).toEqual([]);
    expect(basContributions(line('equity', 'outside-gst', -50000))).toEqual([]);
  });

  it('a tool bought as an asset feeds 1B, and an asset sold is not reported yet (question 28)', () => {
    expect(basContributions(line('asset', 'taxable', 200000, 20000))).toEqual([
      { label: '1B', cents: 20000 },
    ]);
    expect(basContributions(line('asset', 'taxable', -200000, -20000))).toEqual([]);
  });

  it('a one cent taxable sale has G1 but no 1A, since its GST rounds to nothing', () => {
    expect(basContributions(line('income', 'taxable', -1, 0))).toEqual([{ label: 'G1', cents: 1 }]);
  });

  it('a whole entry adds up: the sale of $1,100 and its payment into the bank', () => {
    const lines = [
      line('asset', 'outside-gst', 110000),
      line('income', 'taxable', -100000, -10000),
      line('liability', 'outside-gst', -10000),
    ];
    const totals = new Map<string, number>();
    for (const l of lines) {
      for (const c of basContributions(l))
        totals.set(c.label, (totals.get(c.label) ?? 0) + c.cents);
    }
    expect(Object.fromEntries(totals)).toEqual({ G1: 110000, '1A': 10000 });
  });
});
