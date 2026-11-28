// What the screens are told about the settings (folder 11).

import type { CalendarDate } from './dates';
import type { BasFrequency, GstBasis } from './kinds';

/** The business card (spec 132). The financial year is always 1 July to 30 June. */
export interface BusinessView {
  readonly name: string;
  /** The 11 digits. */
  readonly abn: string;
  readonly gstBasis: GstBasis;
  readonly basFrequency: BasFrequency;
  readonly lockDate: CalendarDate | null;
}

export type BusinessChangeOutcome =
  | { readonly kind: 'saved'; readonly business: BusinessView }
  | {
      readonly kind: 'refused';
      readonly reason: 'not-set-up' | 'empty-name' | 'bad-abn' | 'unchanged';
    };
