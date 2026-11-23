import type { Id } from '@shared/ids';
import type { TaxTreatment } from '@shared/kinds';

/** A GST code, such as `GST` or `FRE`. They are data: the table seeds four, and code reads `treatment`. */
export interface TaxCode {
  readonly id: Id<'tax'>;
  /** What the person sees, such as `GST`. Never compared in code. */
  readonly shortCode: string;
  readonly name: string;
  readonly treatment: TaxTreatment;
  /** Basis points: 1000 is 10%. Zero unless the treatment is taxable. */
  readonly rateBp: number;
  readonly active: boolean;
}
