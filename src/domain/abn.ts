// The Australian Business Number: 11 digits whose first two are check digits.
// Source: Australian Business Register, "Format of the ABN", https://abr.business.gov.au/Help/AbnFormat
// (read 2026-11-23). The rule: subtract 1 from the first digit, multiply each of the 11 digits by
// its weight, add the products, and the ABN is valid when the total divides by 89 with no
// remainder. The page's worked example, 51 824 753 556, totals 534 = 6 x 89.

import { err, ok, type Result } from '@shared/result';

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;
const MODULUS = 89;

export type AbnErrorCode = 'not-11-digits' | 'bad-check-digits';

export interface AbnError {
  readonly code: AbnErrorCode;
}

/**
 * Reads an ABN as a person types it, with or without spaces, and returns its 11 digits.
 * Anything but 11 digits is refused, and so is a number whose check digits do not work out.
 */
export function parseAbn(text: string): Result<string, AbnError> {
  const digits = text.replaceAll(' ', '');
  if (!/^\d{11}$/.test(digits)) return err({ code: 'not-11-digits' });
  const total = WEIGHTS.reduce((sum, weight, index) => {
    const digit = Number(digits.charAt(index)) - (index === 0 ? 1 : 0);
    return sum + digit * weight;
  }, 0);
  return total % MODULUS === 0 ? ok(digits) : err({ code: 'bad-check-digits' });
}
