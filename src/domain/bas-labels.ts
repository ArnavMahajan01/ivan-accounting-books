// Which simpler BAS labels a posted line feeds, so the BAS worksheet is a sum and not a guess.
// Source: ATO, "Simpler BAS GST bookkeeping guide" and "Step 1: Sales", read 2026-11-23:
//  - G1 total sales includes taxable, GST-free and input-taxed sales, and the filer states whether
//    G1 is GST-inclusive or GST-exclusive. This app reports it GST-inclusive.
//  - 1A GST on sales is the GST in taxable sales only.
//  - 1B GST on purchases is the GST credit on purchases for the business.
// Only the simpler BAS. The full labels (G2, G3, G10, G11) and PAYG labels wait for a client question.
//
// A line is read the way the journal stores it (spec 038): `amount` is the net amount, positive
// for a debit and negative for a credit, and `gst` is the GST on the line, with the same sign.
// A sale is a credit to an income account, so its contributions come out positive. A refund of that
// sale is a debit, so its contributions come out negative, and take the figures back off the BAS.

import { asCents, negateCents, ZERO_CENTS, type Cents } from '@shared/money';
import type { AccountType, BasLabel, TaxTreatment } from '@shared/kinds';
import { assertNever } from '@shared/kinds';

export interface BasLine {
  readonly accountType: AccountType;
  readonly treatment: TaxTreatment;
  /** Net of GST. Positive is a debit and negative is a credit. */
  readonly amount: Cents;
  /** The GST on the line, with the same sign as `amount`. */
  readonly gst: Cents;
}

export interface BasContribution {
  readonly label: BasLabel;
  /** Added to the label's total. Negative when the line takes figures off, such as a refund. */
  readonly cents: Cents;
}

function nonZero(contributions: readonly BasContribution[]): BasContribution[] {
  return contributions.filter((c) => c.cents !== ZERO_CENTS);
}

/** What one line adds to G1, 1A and 1B. A line that feeds no label gives an empty list. */
export function basContributions(line: BasLine): BasContribution[] {
  switch (line.accountType) {
    case 'income':
      return nonZero(incomeContributions(line));
    case 'expense':
      return nonZero(purchaseContributions(line));
    case 'asset':
      // A taxable debit is a purchase of an asset, such as a tool or a van. A taxable credit would
      // be a sale of one, which this app does not report yet (client question 28).
      return line.amount > 0 ? nonZero(purchaseContributions(line)) : [];
    case 'liability':
    case 'equity':
      return [];
    default:
      return assertNever(line.accountType);
  }
}

function incomeContributions(line: BasLine): BasContribution[] {
  switch (line.treatment) {
    case 'taxable':
      return [
        { label: 'G1', cents: negateCents(asCents(line.amount + line.gst)) },
        { label: '1A', cents: negateCents(line.gst) },
      ];
    case 'gst-free':
    case 'input-taxed':
      return [{ label: 'G1', cents: negateCents(line.amount) }];
    case 'outside-gst':
      return [];
    default:
      return assertNever(line.treatment);
  }
}

function purchaseContributions(line: BasLine): BasContribution[] {
  return line.treatment === 'taxable' ? [{ label: '1B', cents: line.gst }] : [];
}
