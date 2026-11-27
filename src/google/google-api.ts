// The Drive and Sheets calls the app makes (folder 09), as one small interface, so the services
// that publish and read back can run against real Google (http-google.ts) or the in-memory one
// (fake-google.ts). Every call needs a signed-in connection, and fails with a GoogleFailure.

import type { Result } from '@shared/result';
import type { SheetCell, TabNow, WorkbookPlan } from '@domain/workbook';
import type { GoogleFailure } from './oauth';

/** Drive's names for the roles: viewer, commenter and editor in the app's words. */
export type DriveRole = 'reader' | 'commenter' | 'writer';

export interface DrivePermission {
  readonly id: string;
  /** Null for a permission that is not one person (the app never makes those). */
  readonly email: string | null;
  readonly role: DriveRole | 'owner' | 'other';
}

export interface FileState {
  readonly trashed: boolean;
  /** Drive's last change time, an ISO timestamp. */
  readonly modifiedTime: string;
  /** Who changed it last, for "by accountant@…". Null when Drive does not say. */
  readonly modifiedBy: string | null;
}

export interface GoogleApi {
  /** The signed-in account's email, or null when Drive does not say. */
  email(): Promise<Result<string | null, GoogleFailure>>;
  /** The app's folder in his Drive, made the first time. Returns its id. */
  ensureFolder(name: string): Promise<Result<string, GoogleFailure>>;
  /** A new, empty spreadsheet in that folder. Returns its file id. */
  createSpreadsheet(title: string, folderId: string): Promise<Result<string, GoogleFailure>>;
  fileState(fileId: string): Promise<Result<FileState, GoogleFailure>>;
  /** The workbook's tabs, with the app's markers and protections. */
  tabs(fileId: string): Promise<Result<TabNow[], GoogleFailure>>;
  /** Carries out a plan: tabs, markers, protections, then RAW values (and the app's own formulas). */
  write(fileId: string, plan: WorkbookPlan): Promise<Result<void, GoogleFailure>>;
  /** Cell text, as the sheet shows it, for each A1 range. */
  read(fileId: string, ranges: readonly string[]): Promise<Result<string[][][], GoogleFailure>>;
  permissions(fileId: string): Promise<Result<DrivePermission[], GoogleFailure>>;
  /** Shares with one named person. Never "anyone with the link". */
  share(fileId: string, email: string, role: DriveRole): Promise<Result<void, GoogleFailure>>;
  changeRole(
    fileId: string,
    permissionId: string,
    role: DriveRole,
  ): Promise<Result<void, GoogleFailure>>;
  unshare(fileId: string, permissionId: string): Promise<Result<void, GoogleFailure>>;
}

/** Where a published workbook opens in the browser. */
export function sheetUrl(fileId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/edit`;
}

/** The text a cell shows, as `read` gives it back: used by the fake and by tests. */
export function shownText(cell: SheetCell): string {
  switch (cell.kind) {
    case 'text':
      return cell.text;
    case 'amount': {
      const sign = cell.cents < 0 ? '-' : '';
      const size = String(Math.abs(cell.cents)).padStart(3, '0');
      const whole = size.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${sign}${whole}.${size.slice(-2)}`;
    }
    case 'date': {
      const [y, m, d] = cell.date.split('-');
      return `${d ?? ''}/${m ?? ''}/${y ?? ''}`;
    }
    case 'formula':
      return cell.formula;
    case 'empty':
      return '';
  }
}
