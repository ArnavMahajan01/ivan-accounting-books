// The BAS worksheet's figures for a period (spec 094): G1, 1A and 1B added up from the labels each
// posted line feeds (bas-labels.ts), and the net GST to pay or be refunded. Pure: the caller gives the
// lines of the period.
//
// Cash basis (client question 3, assumed): every line of an entry dated in the period counts,
// because the books post money when it moves through the bank. Accrual basis counts invoices and
// bills by their own dates, which arrive with folder 10; until then both bases count the same lines.

import { asCents, type Cents } from '@shared/money';
import { basContributions, type BasLine } from './bas-labels';

export interface BasFigures {
  /** Total sales, including GST. */
  readonly g1: Cents;
  /** GST on sales. */
  readonly a1: Cents;
  /** GST on purchases. */
  readonly b1: Cents;
  /** 1A less 1B: to pay when positive, to be refunded when negative. */
  readonly net: Cents;
}

export function basFigures(lines: readonly BasLine[]): BasFigures {
  let g1 = 0;
  let a1 = 0;
  let b1 = 0;
  for (const line of lines) {
    for (const c of basContributions(line)) {
      if (c.label === 'G1') g1 += c.cents;
      else if (c.label === '1A') a1 += c.cents;
      else b1 += c.cents;
    }
  }
  return { g1: asCents(g1), a1: asCents(a1), b1: asCents(b1), net: asCents(a1 - b1) };
}
