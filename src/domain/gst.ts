// The one place GST is worked out (risk L6). Every amount, report and BAS figure uses these
// functions, so the same rule gives the same cents everywhere.
//
// A rate is in basis points, as in the `tax_code` table: 1000 is 10%. The ATO describes GST as a
// 10% tax, and says the GST in a GST-inclusive price is one eleventh of it (read 2026-11-23, see
// context/progress/034-tax-codes.md). One eleventh of a price is the same as 10% of the price
// without GST, so both functions below are one formula with a different bottom line.
//
// Rounding: to the nearest cent, with exactly half a cent rounded away from zero (so 10.5 cents
// is 11, and -10.5 cents is -11). The ATO's rule for a single taxable sale on a tax invoice is
// "0.5 of a cent rounded up". All of it is integer arithmetic, with no float, so no amount can
// drift by a cent.

import { asCents, type Cents } from '@shared/money';

/** GST is 10%, in basis points. Tax codes carry their own rate, and this is the standard one. */
export const GST_RATE_BP = 1000;

const BASIS_POINTS = 10_000;

function checkRate(rateBp: number): void {
  if (!Number.isInteger(rateBp) || rateBp < 0 || rateBp > BASIS_POINTS) {
    throw new RangeError(`Not a rate in basis points: ${String(rateBp)}`);
  }
}

/** `numerator / denominator` to the nearest whole number, half away from zero. Denominator above 0. */
function roundHalfAwayFromZero(numerator: number, denominator: number): number {
  const magnitude = Math.abs(numerator);
  // Doubling and adding the denominator turns "round half up" into one floor of an exact quotient.
  const scaled = 2 * magnitude + denominator;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError('That amount is too large to work out GST on exactly');
  }
  const wholePart = (scaled - (scaled % (2 * denominator))) / (2 * denominator);
  return numerator < 0 ? -wholePart : wholePart;
}

/** The GST inside a price that already includes it: one eleventh at 10%. */
export function gstFromInclusive(cents: Cents, rateBp: number = GST_RATE_BP): Cents {
  checkRate(rateBp);
  return asCents(roundHalfAwayFromZero(cents * rateBp, BASIS_POINTS + rateBp));
}

/** The GST to add to a price that does not include it: 10% at the standard rate. */
export function gstOnExclusive(cents: Cents, rateBp: number = GST_RATE_BP): Cents {
  checkRate(rateBp);
  return asCents(roundHalfAwayFromZero(cents * rateBp, BASIS_POINTS));
}

export interface InclusiveSplit {
  readonly net: Cents;
  readonly gst: Cents;
}

/** A GST-inclusive price split into what it is worth without GST, and the GST. They add back exactly. */
export function splitInclusive(cents: Cents, rateBp: number = GST_RATE_BP): InclusiveSplit {
  const gst = gstFromInclusive(cents, rateBp);
  return { net: asCents(cents - gst), gst };
}
