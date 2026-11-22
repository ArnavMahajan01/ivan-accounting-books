import { describe, expect, it } from 'vitest';
import {
  addCents,
  asCents,
  formatCents,
  negateCents,
  parseCents,
  sumCents,
  ZERO_CENTS,
  type MoneyParseErrorCode,
} from './money';

function parsed(text: string): number {
  const r = parseCents(text);
  if (!r.ok) throw new Error(`Expected "${text}" to parse, got ${r.error.code}`);
  return r.value;
}

function failure(text: string): MoneyParseErrorCode {
  const r = parseCents(text);
  if (r.ok) throw new Error(`Expected "${text}" to fail, got ${String(r.value)}`);
  return r.error.code;
}

describe('parseCents', () => {
  it.each([
    ['1,234.50', 123450],
    ['(45.00)', -4500],
    ['12.3', 1230],
    ['45.00-', -4500],
    ['-1,234.50', -123450],
    ['12', 1200],
    ['0.05', 5],
    ['$1,234.50', 123450],
    ['-$45.00', -4500],
    ['($45.00)', -4500],
    ['  12.00  ', 1200],
    ['1234567.89', 123456789],
    ['999,999,999.99', 99999999999],
  ])('reads %j as %i cents', (text, cents) => {
    expect(parsed(text)).toBe(cents);
  });

  it('never returns -0', () => {
    for (const text of ['-0', '-0.00', '(0.00)', '0.00-']) {
      expect(Object.is(parsed(text), 0)).toBe(true);
    }
  });

  it('rejects more than two decimal places, never rounding', () => {
    expect(failure('12.345')).toBe('too-many-decimals');
    expect(failure('0.001')).toBe('too-many-decimals');
  });

  it.each([
    '',
    '   ',
    'abc',
    '$',
    '-',
    '()',
    '1.2.3',
    '12.',
    '.50',
    '1,23',
    '1,2345.00',
    ',123',
    '(45.00',
    '45.00)',
    '-(45.00)',
    '-45.00-',
    '(45.00)-',
    '+12.00',
    '$-12.00',
    '12 000',
    '1e3',
    '12.3a',
    'NaN',
    'Infinity',
    '١٢',
  ])('rejects %j as not an amount', (text) => {
    expect(failure(text)).toBe('not-an-amount');
  });

  it('rejects an amount too large to hold exactly', () => {
    expect(parsed('90,071,992,547,409.91')).toBe(Number.MAX_SAFE_INTEGER);
    expect(failure('90,071,992,547,409.92')).toBe('too-large');
    expect(failure('99999999999999999999')).toBe('too-large');
  });

  it('keeps the original text in the error', () => {
    expect(parseCents(' abc ')).toEqual({
      ok: false,
      error: { code: 'not-an-amount', text: ' abc ' },
    });
  });
});

describe('formatCents', () => {
  it.each([
    [-123450, '-$1,234.50'],
    [123450, '$1,234.50'],
    [0, '$0.00'],
    [5, '$0.05'],
    [-5, '-$0.05'],
    [100, '$1.00'],
    [99999999999, '$999,999,999.99'],
    [Number.MAX_SAFE_INTEGER, '$90,071,992,547,409.91'],
  ])('shows %i cents as %j', (cents, text) => {
    expect(formatCents(asCents(cents))).toBe(text);
  });

  it('shows -0 as zero, with no minus sign', () => {
    expect(formatCents(-0 as ReturnType<typeof asCents>)).toBe('$0.00');
  });

  it('round-trips with parseCents', () => {
    for (const cents of [-123450, -1, 0, 1, 99, 100, 99999999999]) {
      expect(parsed(formatCents(asCents(cents)))).toBe(cents);
    }
  });
});

describe('asCents', () => {
  it('turns -0 into 0', () => {
    expect(Object.is(asCents(-0), 0)).toBe(true);
  });

  it.each([0.5, 12.3, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'throws for %d, which is not a safe whole number of cents',
    (value) => {
      expect(() => asCents(value)).toThrow(RangeError);
    },
  );
});

describe('addCents, sumCents and negateCents', () => {
  it('adds exactly where floats would drift', () => {
    // 0.1 + 0.2 in dollars is 0.30000000000000004 as a float.
    expect(addCents(asCents(10), asCents(20))).toBe(30);
    expect(sumCents(Array.from({ length: 1000 }, () => asCents(1)))).toBe(1000);
  });

  it('sums a list, and an empty list is zero', () => {
    expect(sumCents([asCents(123450), asCents(-4500), asCents(5)])).toBe(118955);
    expect(sumCents([])).toBe(ZERO_CENTS);
  });

  it('negates, and zero stays 0', () => {
    expect(negateCents(asCents(4500))).toBe(-4500);
    expect(negateCents(asCents(-4500))).toBe(4500);
    expect(Object.is(negateCents(ZERO_CENTS), 0)).toBe(true);
  });

  it('handles very large values exactly', () => {
    const big = asCents(99999999999);
    expect(addCents(big, big)).toBe(199999999998);
    expect(addCents(big, negateCents(big))).toBe(0);
  });

  it('throws when a total would be too large to hold exactly', () => {
    const max = asCents(Number.MAX_SAFE_INTEGER);
    expect(() => addCents(max, asCents(1))).toThrow(RangeError);
    expect(() => sumCents([max, asCents(1)])).toThrow(RangeError);
    expect(() => addCents(negateCents(max), asCents(-1))).toThrow(RangeError);
  });
});
