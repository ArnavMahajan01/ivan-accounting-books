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

/** The bank accounts card (spec 133). */
export interface BankAccountsSettings {
  readonly accounts: readonly {
    readonly id: string;
    readonly name: string;
    readonly bank: string;
    readonly lastFour: string;
    readonly active: boolean;
    /** The account in the chart that holds its balance. */
    readonly ledger: { readonly code: string; readonly name: string };
  }[];
  /** Asset accounts in use that no bank account is linked to yet: what a new one can hold. */
  readonly freeLedgers: readonly {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  }[];
}

export type BankAccountOutcome =
  | { readonly kind: 'saved'; readonly id: string }
  | { readonly kind: 'refused'; readonly reason: string };

/** Light, dark, or the same as the Mac (spec 133). */
export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type Appearance = (typeof APPEARANCES)[number];
