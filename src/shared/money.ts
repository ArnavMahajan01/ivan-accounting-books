// The only way money is read, added and shown: integer cents in AUD (context/code-standards.md, "Money").
// No float ever touches an amount, so no amount can drift by a cent (risk L2).

import { err, ok, type Result } from './result';

declare const centsBrand: unique symbol;
/** A whole number of cents in AUD. Make one only with `parseCents` or `asCents`. */
export type Cents = number & { readonly [centsBrand]: true };

export type MoneyParseErrorCode = 'not-an-amount' | 'too-many-decimals' | 'too-large';

export interface MoneyParseError {
  readonly code: MoneyParseErrorCode;
  readonly text: string;
}

export const ZERO_CENTS = asCents(0);

/**
 * Turns a whole number of cents into `Cents`. Throws if it is not a safe integer, because
 * every caller already holds a checked integer (a database row, a constant), so a bad value is a bug.
 * `-0` becomes `0`.
 */
export function asCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Not a safe whole number of cents: ${String(value)}`);
  }
  return (value === 0 ? 0 : value) as Cents;
}

// One optional negative marker (leading minus, brackets, or trailing minus), an optional dollar sign,
// whole dollars with or without correct thousands commas, then an optional point and 1 or 2 digits.
const AMOUNT_PATTERN =
  /^(?<lead>-)?(?<open>\()?\$?(?<whole>\d{1,3}(?:,\d{3})+|\d+)(?:\.(?<fraction>\d+))?(?<close>\))?(?<trail>-)?$/;

/**
 * Reads bank-style text into cents without a float: `"1,234.50"`, `"-12.3"`, `"(45.00)"`,
 * `"45.00-"`, `"$1,234"`. Surrounding spaces are ignored. Anything else is an error, never zero.
 */
export function parseCents(text: string): Result<Cents, MoneyParseError> {
  const match = AMOUNT_PATTERN.exec(text.trim());
  const groups = match?.groups;
  if (groups?.whole === undefined) {
    return err({ code: 'not-an-amount', text });
  }
  const { lead, open, close, trail, whole, fraction = '' } = groups;
  const bracketed = open !== undefined;
  if (bracketed !== (close !== undefined)) {
    return err({ code: 'not-an-amount', text });
  }
  const negativeMarkers = [lead, trail].filter((m) => m !== undefined).length + (bracketed ? 1 : 0);
  if (negativeMarkers > 1) {
    return err({ code: 'not-an-amount', text });
  }
  if (fraction.length > 2) {
    return err({ code: 'too-many-decimals', text });
  }

  const digits = whole.replaceAll(',', '') + fraction.padEnd(2, '0');
  let magnitude = 0;
  for (const digit of digits) {
    magnitude = magnitude * 10 + (digit.charCodeAt(0) - 48);
    if (!Number.isSafeInteger(magnitude)) {
      return err({ code: 'too-large', text });
    }
  }
  return ok(asCents(negativeMarkers === 1 ? -magnitude : magnitude));
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

/** Shows cents as AUD in en-AU style, with a minus sign for negatives: `-$1,234.50`. */
export function formatCents(cents: Cents): string {
  const magnitude = String(Math.abs(cents)).padStart(3, '0');
  const sign = cents < 0 ? '-' : '';
  // An exact decimal string, so formatting never goes through a float either.
  const decimal = `${sign}${magnitude.slice(0, -2)}.${magnitude.slice(-2)}` as `${number}`;
  return AUD.format(decimal);
}

/** Adds two amounts. Throws if the total is too large to hold exactly, which only a bug can cause. */
export function addCents(a: Cents, b: Cents): Cents {
  return asCents(a + b);
}

/** Adds any number of amounts. An empty list is zero. */
export function sumCents(amounts: readonly Cents[]): Cents {
  return amounts.reduce(addCents, ZERO_CENTS);
}

/** Flips the sign. Zero stays `0`, never `-0`. */
export function negateCents(cents: Cents): Cents {
  return asCents(0 - cents);
}
