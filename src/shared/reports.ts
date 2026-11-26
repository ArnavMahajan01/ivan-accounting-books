// Reports (folder 08), shared by the report rules, the bridge, the screens and the exports. A report
// is asked for with a `ReportRequest` (which report, which period, which columns and rows) and comes
// back as a `ReportView`: columns, and rows of cells. Every money cell can say which lines make it
// up, so any figure opens them (spec 093). Saved layouts (spec 101) are requests with a name.

import type { CalendarDate } from './dates';
import type { BasLabel } from './kinds';
import type { Cents } from './money';

export const REPORT_KINDS = ['profit-and-loss', 'balance-sheet', 'trial-balance', 'bas'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_TITLES: Record<ReportKind, string> = {
  'profit-and-loss': 'Profit and loss',
  'balance-sheet': 'Balance sheet',
  'trial-balance': 'Trial balance',
  bas: 'BAS worksheet',
};

export const PERIOD_CHOICES = [
  'this-quarter',
  'last-quarter',
  'this-year',
  'last-year',
  'custom',
] as const;
export type PeriodChoice = (typeof PERIOD_CHOICES)[number];

export interface ReportPeriod {
  readonly choice: PeriodChoice;
  /** Only for `custom`: the first and last day, `YYYY-MM-DD`. */
  readonly from: string | null;
  readonly to: string | null;
}

export const CALC_KINDS = [
  'difference',
  'percent-change',
  'percent-of-income',
  'gst-inside',
  'flag-over',
] as const;
export type CalcKind = (typeof CALC_KINDS)[number];

/** A column he adds (spec 102): his own notes, or a calculation picked from a list. */
export type OwnColumn =
  | {
      readonly kind: 'notes';
      readonly name: string;
      /** By row key (an account id). */
      readonly notes: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: 'calc';
      readonly name: string;
      readonly calc: CalcKind;
      /** The column it works on, by key, such as `p0` (the report's period) or `p1` (the one before). */
      readonly a: string;
      /** The second column, for a difference or a % change. */
      readonly b: string | null;
      /** The amount, in cents, for "flag if over". */
      readonly amount: number | null;
    };

export interface ReportRequest {
  readonly report: ReportKind;
  readonly period: ReportPeriod;
  /** Balance sheet only: the day it is as at. Null means today. */
  readonly asAt: string | null;
  readonly columns: {
    readonly lastPeriod: boolean;
    readonly sameLastYear: boolean;
    readonly percentOfIncome: boolean;
    readonly monthByMonth: boolean;
  };
  readonly rows: {
    readonly showEmpty: boolean;
    readonly groupSmall: boolean;
    readonly showCodes: boolean;
  };
  readonly ownColumns: readonly OwnColumn[];
}

/** The plain request for a report: its usual period and no extra columns. */
export function plainRequest(report: ReportKind): ReportRequest {
  return {
    report,
    period: {
      choice:
        report === 'bas'
          ? 'last-quarter'
          : report === 'profit-and-loss'
            ? 'this-quarter'
            : 'this-year',
      from: null,
      to: null,
    },
    asAt: null,
    columns: {
      lastPeriod: false,
      sameLastYear: false,
      percentOfIncome: false,
      monthByMonth: false,
    },
    rows: { showEmpty: false, groupSmall: false, showCodes: false },
    ownColumns: [],
  };
}

/** What a money figure is made of: an account's lines over a range, or a BAS label's lines. */
export type Drill =
  | {
      readonly kind: 'account';
      readonly accountId: string;
      /**
       * How the lines are added up so they come to the figure: the natural way round (as on the
       * profit and loss and balance sheet), or as debits or credits (the trial balance).
       */
      readonly side: 'natural' | 'debit' | 'credit';
      /** Null means from the start of the books, as on a balance sheet. */
      readonly from: CalendarDate | null;
      readonly to: CalendarDate;
    }
  | {
      readonly kind: 'bas';
      readonly label: BasLabel;
      readonly from: CalendarDate;
      readonly to: CalendarDate;
    };

export type ReportCell =
  | { readonly kind: 'money'; readonly cents: Cents; readonly drill: Drill | null }
  /** Basis points: 2550 is 25.5%. Null when it cannot be worked out, such as a % of nothing. */
  | { readonly kind: 'percent'; readonly bp: number | null }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'flag'; readonly on: boolean }
  | { readonly kind: 'empty' };

export interface ReportColumn {
  readonly key: string;
  readonly label: string;
}

export interface ReportRow {
  readonly kind: 'heading' | 'account' | 'total' | 'grand';
  /** An account id for an account row; a fixed name for the others. */
  readonly key: string;
  readonly label: string;
  /** The account code, or a BAS label such as `G1`. */
  readonly code: string | null;
  /** One per column. A heading row has empty cells. */
  readonly cells: readonly ReportCell[];
}

export interface ReportView {
  readonly title: string;
  /** In words: "Oct–Dec 2026", "As at 30/09/2026". */
  readonly periodText: string;
  readonly from: CalendarDate | null;
  readonly to: CalendarDate;
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly ReportRow[];
  /** The report's own check in words, such as "Assets equal liabilities plus equity." */
  readonly check: { readonly ok: boolean; readonly text: string } | null;
  /** A note under the report, such as the BAS footnote. */
  readonly note: string | null;
  /** Every day of the report is on or before the lock date. */
  readonly locked: boolean;
}
