// What the screens are told about Google and the published sheets (folder 09). Never a token.

import { z } from 'zod';
import { reportRequestSchema } from './report-request-schema';
import { PERIOD_CHOICES, type ReportPeriod, type ReportRequest } from './reports';

/** What a workbook can hold: one of the reports, or the transaction list for a period. */
export const WORKBOOK_KINDS = [
  'profit-and-loss',
  'balance-sheet',
  'trial-balance',
  'bas',
  'transactions',
] as const;
export type WorkbookKind = (typeof WORKBOOK_KINDS)[number];

/**
 * What to publish: a report as the screen shows it, or the transactions for a period. Stored with
 * a link with its period pinned to whole days (`custom`), so publishing again sends the same period.
 */
export type PublishRequest =
  | { readonly kind: 'report'; readonly request: ReportRequest }
  | { readonly kind: 'transactions'; readonly period: ReportPeriod };
export type PublishedRequest = PublishRequest;

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const publishRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('report'), request: reportRequestSchema }),
  z.strictObject({
    kind: z.literal('transactions'),
    period: z.strictObject({
      choice: z.enum(PERIOD_CHOICES),
      from: dateText.nullable(),
      to: dateText.nullable(),
    }),
  }),
]);
export const publishedRequestSchema = publishRequestSchema;

/** Why publishing did not happen. Nothing in the books changes either way. */
export type PublishRefusal =
  /** Google is not connected (or not set up): connect in Settings first. */
  'not-connected' | 'needs-sign-in' | 'offline' | 'bad-period' | 'not-set-up' | 'failed';

export type PublishOutcome =
  | {
      readonly kind: 'published';
      readonly linkId: string;
      readonly title: string;
      /** A new workbook, or the same one updated in place. */
      readonly isNew: boolean;
      /** His own tabs, left as they were. */
      readonly kept: readonly string[];
      /** Rows added, changed and gone since last time. Null for a new workbook. */
      readonly changes: {
        readonly added: number;
        readonly changed: number;
        readonly removed: number;
      } | null;
    }
  /** The workbook was deleted in Drive: he can publish it as a new one. */
  | { readonly kind: 'missing'; readonly linkId: string; readonly title: string }
  | { readonly kind: 'refused'; readonly reason: PublishRefusal };

/** Why connecting did not work, in the words Settings uses. */
export type ConnectProblem =
  /** Built without a Google client id (spec 106). */
  | 'not-set-up'
  /** He closed the browser page, said no, or took longer than five minutes. */
  | 'cancelled'
  | 'offline'
  /** He unticked "see and edit the files this app makes" on Google's page. */
  | 'scope-refused'
  /** The Mac's Keychain could not keep the sign-in. */
  | 'no-keychain'
  /** A sign-in is already open in the browser. */
  | 'busy'
  | 'failed';

/** The Google connection, as Settings and the banner show it. */
export type GoogleStatus =
  /** The app was built without a Google client id (spec 106). */
  | { readonly kind: 'not-set-up' }
  | { readonly kind: 'not-connected' }
  | { readonly kind: 'connected'; readonly email: string | null }
  /** The sign-in expired or was taken back: "Google needs you to sign in again". */
  | { readonly kind: 'needs-sign-in'; readonly email: string | null };

/** One cell of the preview, as the sheet will show it. */
export interface PreviewCell {
  readonly text: string;
  /** An amount or a date: drawn on the right. */
  readonly figure: boolean;
}

/** What Google will get, drawn by the app before he publishes (spec 112). Needs no internet. */
export interface PublishPreview {
  /** "Profit and loss · Oct–Dec 2026". */
  readonly title: string;
  /** A new workbook, the one already published, or one that has gone from Drive. */
  readonly target: 'new' | 'update' | 'missing';
  readonly linkId: string | null;
  /** When it was last published, or null. */
  readonly publishedAt: string | null;
  readonly tabs: readonly {
    readonly title: string;
    readonly columns: number;
    readonly rows: readonly (readonly PreviewCell[])[];
  }[];
  /** His own tabs, as they were at the last publish: left alone. */
  readonly kept: readonly string[];
}
