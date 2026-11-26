// The calculations he can pick for his own report column (spec 102). Pure, and integer maths only:
// money stays in whole cents and percentages come back in basis points (2550 is 25.5%). A
// percentage of nothing cannot be worked out, so it is null, and the screen shows "n/a" in words.

import type { Cents } from '@shared/money';
import { asCents } from '@shared/money';
import { gstFromInclusive } from './gst';

const WHOLE_BP = 10_000;

/** `numerator / denominator` in basis points, to the nearest one, half away from zero. */
export function ratioBp(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const scaled = numerator * WHOLE_BP;
  const sign = scaled < 0 !== denominator < 0 ? -1 : 1;
  const a = Math.abs(scaled);
  const b = Math.abs(denominator);
  return sign * Math.floor((2 * a + b) / (2 * b));
}

/** `a` less `b`. */
export function difference(a: Cents, b: Cents): Cents {
  return asCents(a - b);
}

/** How much `a` changed from `b`, as a share of `b`. Null when `b` is nothing. */
export function percentChange(a: Cents, b: Cents): number | null {
  return ratioBp(a - b, Math.abs(b));
}

/** `amount` as a share of income. Null when there is no income. */
export function percentOfIncome(amount: Cents, income: Cents): number | null {
  return ratioBp(amount, income);
}

/** The GST inside a GST-inclusive amount: one eleventh, from the one GST helper. */
export function gstInside(amount: Cents): Cents {
  return gstFromInclusive(amount);
}

/** Whether the amount is over the limit. */
export function flagOver(amount: Cents, limit: Cents): boolean {
  return amount > limit;
}

export { percentText } from '@shared/percent';
