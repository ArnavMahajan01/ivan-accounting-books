import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { closestByDate } from './closest-date';
import { findEntryMatch } from './entry-match';
import { findTransferMatch, type TransferSide } from './transfer-match';

const d = (text: string) => text as CalendarDate;
const side = (id: string, account: string, date: string, amount: number): TransferSide => ({
  id,
  bankAccountId: account,
  date: d(date),
  amount: asCents(amount),
});

describe('findTransferMatch', () => {
  const out = side('stl_out', 'bnk_one', '2026-11-06', -200000);

  it('finds the same amount the other way in another account', () => {
    const match = side('stl_in', 'bnk_reserve', '2026-11-07', 200000);
    expect(findTransferMatch(out, [match])).toBe(match);
  });

  it('takes the closest day when there are several', () => {
    const far = side('stl_far', 'bnk_reserve', '2026-11-10', 200000);
    const near = side('stl_near', 'bnk_reserve', '2026-11-05', 200000);
    expect(findTransferMatch(out, [far, near])).toBe(near);
  });

  it('finds nothing in the same account, for another amount, the same way, or after five days', () => {
    expect(
      findTransferMatch(out, [
        side('a', 'bnk_one', '2026-11-06', 200000),
        side('b', 'bnk_reserve', '2026-11-06', 199999),
        side('c', 'bnk_reserve', '2026-11-06', -200000),
        side('d', 'bnk_reserve', '2026-11-12', 200000),
      ]),
    ).toBeNull();
  });

  it('accepts exactly five days either way', () => {
    const later = side('stl_in', 'bnk_reserve', '2026-11-11', 200000);
    expect(findTransferMatch(out, [later])).toBe(later);
    const earlier = side('stl_in2', 'bnk_reserve', '2026-11-01', 200000);
    expect(findTransferMatch(out, [earlier])).toBe(earlier);
  });
});

describe('closestByDate', () => {
  it('breaks a tie by the earlier day, then by id, whatever the order given', () => {
    const items = [
      { id: 'b', date: d('2026-11-08') },
      { id: 'a', date: d('2026-11-04') },
      { id: 'c', date: d('2026-11-04') },
    ];
    expect(closestByDate(d('2026-11-06'), items, 5)?.id).toBe('a');
    expect(closestByDate(d('2026-11-06'), [...items].reverse(), 5)?.id).toBe('a');
  });
});

describe('findEntryMatch', () => {
  const line = { date: d('2026-11-04'), amount: asCents(-41260) };

  it('finds an entry that moved the same amount through the bank nearby', () => {
    const entry = { id: 'ent_1', date: d('2026-11-03'), bankAmount: asCents(-41260) };
    expect(findEntryMatch(line, [entry])).toBe(entry);
  });

  it('finds nothing for another amount, the other way, or more than five days away', () => {
    expect(
      findEntryMatch(line, [
        { id: 'ent_1', date: d('2026-11-04'), bankAmount: asCents(-41261) },
        { id: 'ent_2', date: d('2026-11-04'), bankAmount: asCents(41260) },
        { id: 'ent_3', date: d('2026-11-10'), bankAmount: asCents(-41260) },
      ]),
    ).toBeNull();
  });
});
