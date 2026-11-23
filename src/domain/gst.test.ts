import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { GST_RATE_BP, gstFromInclusive, gstOnExclusive, splitInclusive } from './gst';

const c = asCents;

describe('gstFromInclusive', () => {
  it('is one eleventh: $11.00 has $1.00 of GST, never 10% of it', () => {
    expect(gstFromInclusive(c(1100))).toBe(100);
    expect(gstFromInclusive(c(110000))).toBe(10000);
    expect(gstFromInclusive(c(55000))).toBe(5000);
  });

  it('rounds to the nearest cent', () => {
    expect(gstFromInclusive(c(1999))).toBe(182); // 181.727
    expect(gstFromInclusive(c(1005))).toBe(91); // 91.364
  });

  it('handles 1 cent, 5 cents and a very large amount', () => {
    expect(gstFromInclusive(c(1))).toBe(0);
    expect(gstFromInclusive(c(5))).toBe(0); // 0.4545
    expect(gstFromInclusive(c(6))).toBe(1); // 0.5454
    expect(gstFromInclusive(c(99_999_999))).toBe(9_090_909);
  });

  it('is the mirror image for negative amounts, such as a refund', () => {
    expect(gstFromInclusive(c(-1100))).toBe(-100);
    expect(gstFromInclusive(c(-6))).toBe(-1);
    expect(gstFromInclusive(c(-5))).toBe(0);
    expect(Object.is(gstFromInclusive(c(-5)), 0)).toBe(true);
  });

  it('is zero for zero, and for a zero rate', () => {
    expect(gstFromInclusive(c(0))).toBe(0);
    expect(gstFromInclusive(c(1100), 0)).toBe(0);
  });

  it('works for any rate in basis points', () => {
    expect(gstFromInclusive(c(1050), 500)).toBe(50); // 5%
  });
});

describe('gstOnExclusive', () => {
  it('is 10% of the amount', () => {
    expect(gstOnExclusive(c(1000))).toBe(100);
    expect(gstOnExclusive(c(100000))).toBe(10000);
  });

  it('rounds exactly half a cent away from zero', () => {
    expect(gstOnExclusive(c(105))).toBe(11); // 10.5
    expect(gstOnExclusive(c(-105))).toBe(-11);
    expect(gstOnExclusive(c(104))).toBe(10); // 10.4
    expect(gstOnExclusive(c(5))).toBe(1); // 0.5
    expect(gstOnExclusive(c(-5))).toBe(-1);
    expect(gstOnExclusive(c(4))).toBe(0);
  });

  it('is zero for a zero rate, and for zero', () => {
    expect(gstOnExclusive(c(1000), 0)).toBe(0);
    expect(gstOnExclusive(c(0))).toBe(0);
  });

  it('handles a very large amount', () => {
    expect(gstOnExclusive(c(99_999_999))).toBe(10_000_000); // 9,999,999.9
  });
});

describe('splitInclusive', () => {
  it('splits $11.00 into $10.00 and $1.00', () => {
    expect(splitInclusive(c(1100))).toEqual({ net: 1000, gst: 100 });
  });

  it('always adds back exactly, for every amount from -3,000 to 3,000 cents and at several rates', () => {
    for (const rate of [GST_RATE_BP, 0, 500, 1500]) {
      for (let cents = -3000; cents <= 3000; cents += 1) {
        const { net, gst } = splitInclusive(c(cents), rate);
        expect(net + gst, `${String(cents)} at ${String(rate)}`).toBe(cents);
      }
    }
  });

  it('adds back exactly for very large amounts', () => {
    for (const cents of [99_999_999, 99_999_997, -99_999_999, 4_503_599_627]) {
      const { net, gst } = splitInclusive(c(cents));
      expect(net + gst).toBe(cents);
    }
  });

  it('keeps the GST under the whole amount and the same sign', () => {
    for (let cents = -500; cents <= 500; cents += 1) {
      const { gst } = splitInclusive(c(cents));
      expect(Math.abs(gst)).toBeLessThanOrEqual(Math.abs(cents));
      expect(gst === 0 || Math.sign(gst) === Math.sign(cents)).toBe(true);
    }
  });
});

describe('refusing what cannot be worked out exactly', () => {
  it.each([-1, 10001, 0.5, Number.NaN])('refuses the rate %s', (rate) => {
    expect(() => gstFromInclusive(c(1100), rate)).toThrow(RangeError);
    expect(() => gstOnExclusive(c(1100), rate)).toThrow(RangeError);
  });

  it('refuses an amount too large to be exact', () => {
    expect(() => gstFromInclusive(c(Number.MAX_SAFE_INTEGER))).toThrow(RangeError);
  });
});
