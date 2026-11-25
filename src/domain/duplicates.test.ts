import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { lineKeys, markDuplicates, type LineFacts } from './duplicates';

function line(
  date: string,
  cents: number,
  description: string,
  bankId: string | null = null,
  balance: number | null = null,
): LineFacts {
  const d = parseCalendarDate(date, 'YYYY-MM-DD');
  if (!d.ok) throw new Error(date);
  return {
    date: d.value,
    description,
    amount: asCents(cents),
    bankId,
    balance: balance === null ? null : asCents(balance),
  };
}

const keysOf = (lines: LineFacts[]) => new Set(lineKeys(lines));
const statusOf = (lines: LineFacts[], existing: Set<string>) =>
  markDuplicates(lines, existing).map((c) => c.status);

describe('line keys', () => {
  it('use the bank id when the file has one, whatever else differs', () => {
    expect(
      lineKeys([line('2026-11-02', -100, 'A', 'F1'), line('2026-11-02', -100, 'A', 'F2')]),
    ).toEqual(['id:F1', 'id:F2']);
    expect(lineKeys([line('2026-11-02', -100, 'A', 'F1')])).toEqual(
      lineKeys([line('2026-11-09', -999, 'B', 'F1')]),
    );
  });

  it('are worked out from the day, amount, description and balance when there is no bank id', () => {
    const [a] = lineKeys([line('2026-11-02', -450, 'COFFEE', null, 10000)]);
    expect(lineKeys([line('2026-11-03', -450, 'COFFEE', null, 10000)])[0]).not.toBe(a);
    expect(lineKeys([line('2026-11-02', -451, 'COFFEE', null, 10000)])[0]).not.toBe(a);
    expect(lineKeys([line('2026-11-02', -450, 'TEA', null, 10000)])[0]).not.toBe(a);
    expect(lineKeys([line('2026-11-02', -450, 'COFFEE', null, 9999)])[0]).not.toBe(a);
    expect(lineKeys([line('2026-11-02', -450, 'COFFEE', null, null)])[0]).not.toBe(a);
  });

  it('ignore capitals and extra spaces in the description', () => {
    expect(lineKeys([line('2026-11-02', -450, '  Coffee   shop ')])).toEqual(
      lineKeys([line('2026-11-02', -450, 'COFFEE SHOP')]),
    );
  });

  it('tell two identical lines apart by how many came before, never by where they sit in the file', () => {
    const coffee = line('2026-11-02', -450, 'COFFEE');
    const keys = lineKeys([coffee, line('2026-11-02', -100, 'OTHER'), coffee]);
    expect(new Set(keys).size).toBe(3);
    // The same coffee, first of its kind, gets the same key at any place in another file.
    expect(lineKeys([line('2026-11-05', -1, 'X'), line('2026-11-05', -2, 'Y'), coffee])[2]).toBe(
      keys[0],
    );
  });

  it('keep two lines that share a bank id, instead of dropping one', () => {
    const keys = lineKeys([
      line('2026-11-02', -100, 'A', 'F1'),
      line('2026-11-03', -200, 'B', 'F1'),
    ]);
    expect(keys).toEqual(['id:F1', 'id:F1#2']);
  });
});

describe('marking duplicates', () => {
  const clean = [
    line('2026-11-02', -330000, 'RENT', 'F1'),
    line('2026-11-04', 935000, 'DEPOSIT', 'F2'),
    line('2026-11-05', -20570, 'INSURANCE', 'F3'),
  ];

  it('marks every line new when nothing is stored', () => {
    expect(statusOf(clean, new Set())).toEqual(['new', 'new', 'new']);
  });

  it('adds nothing when the same file comes again', () => {
    expect(statusOf(clean, keysOf(clean))).toEqual(['duplicate', 'duplicate', 'duplicate']);
  });

  it('adds only the new days of an overlapping file, with or without bank ids', () => {
    const later = [...clean.slice(1), line('2026-11-06', -39455, 'BUNNINGS', 'F4')];
    expect(statusOf(later, keysOf(clean))).toEqual(['duplicate', 'duplicate', 'new']);

    const bare = (lines: LineFacts[]) => lines.map((l) => ({ ...l, bankId: null }));
    expect(statusOf(bare(later), keysOf(bare(clean)))).toEqual(['duplicate', 'duplicate', 'new']);
  });

  it('keeps two identical coffees on one day, and adds only the third when it arrives later', () => {
    const coffee = line('2026-11-02', -450, 'COFFEE SHOP');
    const first = [coffee, coffee];
    expect(statusOf(first, new Set())).toEqual(['new', 'new']);
    expect(statusOf(first, keysOf(first))).toEqual(['duplicate', 'duplicate']);
    expect(statusOf([coffee, coffee, coffee], keysOf(first))).toEqual([
      'duplicate',
      'duplicate',
      'new',
    ]);
  });

  it('returns each line with its key, in the file’s order', () => {
    const [first] = markDuplicates(clean, new Set());
    expect(first).toMatchObject({ key: 'id:F1', status: 'new', line: clean[0] });
  });
});
