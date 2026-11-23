import { describe, expect, it } from 'vitest';
import type { CalendarDate, Timestamp } from '@shared/dates';
import { asCents } from '@shared/money';
import { describeEntryChange, type NameLookup } from './entry-diff';
import type { JournalEntry, JournalLine } from './journal';

const names: NameLookup = {
  account: (id) =>
    ({
      acc_tools: 'Tools and small equipment',
      acc_mat: 'Materials and supplies',
      acc_bank: 'Business One ··4821',
    })[id] ?? id,
  payee: (id) => ({ con_a: 'Bunnings', con_b: 'Toolmart' })[id] ?? id,
};
const time = '2026-11-18T02:00:00.000Z' as Timestamp;
const line = (
  id: string,
  accountId: string,
  amount: number,
  payeeId: string | null = null,
): JournalLine => ({
  id: `lin_${id}`,
  accountId: accountId as JournalLine['accountId'],
  amount: asCents(amount),
  taxCodeId: null,
  gst: asCents(0),
  payeeId,
  memo: '',
});
const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'ent_1',
  date: '2026-11-18' as CalendarDate,
  memo: 'Fixings and sundries',
  sourceKind: 'bank-line',
  sourceId: null,
  lines: [line('1', 'acc_tools', 34215, 'con_a'), line('2', 'acc_bank', -34215, 'con_a')],
  createdAt: time,
  updatedAt: time,
  ...over,
});

describe('describeEntryChange', () => {
  it('says which account it moved from and to', () => {
    const after = entry({
      lines: [line('3', 'acc_mat', 34215, 'con_a'), line('4', 'acc_bank', -34215, 'con_a')],
    });
    expect(describeEntryChange(entry(), after, names)).toEqual([
      'Account changed from Tools and small equipment to Materials and supplies',
    ]);
  });

  it('says a date change in the Australian way', () => {
    expect(
      describeEntryChange(
        entry({ date: '2026-09-29' as CalendarDate }),
        entry({ date: '2026-09-28' as CalendarDate }),
        names,
      ),
    ).toEqual(['Date changed from 29/09/2026 to 28/09/2026']);
  });

  it('says a new description, payee and total', () => {
    const after = entry({
      memo: 'Hinges',
      lines: [line('3', 'acc_tools', 40000, 'con_b'), line('4', 'acc_bank', -40000, 'con_b')],
    });
    expect(describeEntryChange(entry(), after, names)).toEqual([
      'Description changed from “Fixings and sundries” to “Hinges”',
      'Payee changed from Bunnings to Toolmart',
      'Total changed from $342.15 to $400.00',
    ]);
  });

  it('says nothing for an entry that reads the same, and notes a different number of lines', () => {
    expect(describeEntryChange(entry(), entry(), names)).toEqual([]);
    const split = entry({
      lines: [
        line('3', 'acc_tools', 20000),
        line('4', 'acc_mat', 14215),
        line('5', 'acc_bank', -34215),
      ],
    });
    expect(describeEntryChange(entry(), split, names)).toEqual(['The lines of the entry changed']);
  });
});
