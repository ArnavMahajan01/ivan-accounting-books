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

/** His Help choices on this Mac (spec 134): starred guides and his own tags. */
export interface HelpPrefs {
  readonly starred: readonly string[];
  readonly tags: readonly { readonly name: string; readonly guides: readonly string[] }[];
}

export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 30;

/** The Backups card (specs 136, 137). Only the folder's name reaches the screens, never its path. */
export interface BackupStatus {
  readonly folderName: string | null;
  readonly daily: boolean;
  readonly lastBackupAt: string | null;
  /** A backup key exists in the Keychain on this Mac. */
  readonly keyReady: boolean;
}

export type BackupNowOutcome =
  | { readonly kind: 'done'; readonly fileName: string; readonly at: string }
  | {
      readonly kind: 'refused';
      readonly reason: 'no-folder' | 'no-key' | 'no-keychain' | 'books-closed' | 'not-written';
    };

export type TurnOnOutcome =
  | { readonly kind: 'on'; readonly recoveryKey: string }
  | { readonly kind: 'refused'; readonly reason: 'no-folder' | 'no-keychain' };

export interface BackupRow {
  readonly name: string;
  readonly createdAt: string;
  readonly entries: number;
  readonly bytes: number;
}

export type RestoreOutcome =
  | { readonly kind: 'restored'; readonly entries: number }
  | {
      readonly kind: 'refused';
      readonly reason:
        | 'needs-recovery-key'
        | 'bad-recovery-key'
        | 'wrong-key'
        | 'not-a-backup'
        | 'damaged'
        | 'other-mode'
        | 'unreadable'
        | 'checks-failed'
        | 'no-folder'
        | 'failed';
    };
