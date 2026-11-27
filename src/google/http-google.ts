// The real Drive and Sheets calls, with plain HTTPS through `fetch` (folder 09). Read from
// Google's REST references on 2026-11-27 (.claude/skills/google-sheets-drive, "Links"). Values are
// written with valueInputOption=RAW, so no text from a bank becomes a formula for the accountant;
// only the app's own example formulas are written as formulas. Responses are checked with Zod.

import { z } from 'zod';
import { daysBetween, parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import {
  a1Range,
  cellA1,
  PROTECTION_MARK,
  TAB_MARKER,
  type SheetCell,
  type TabWrite,
  type WorkbookPlan,
} from '@domain/workbook';
import type { DrivePermission, DriveRole, FileState, GoogleApi } from './google-api';
import type { Fetch, GoogleFailure } from './oauth';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';
const SHEET_TYPE = 'application/vnd.google-apps.spreadsheet';

const AMOUNT_FORMAT = { type: 'NUMBER', pattern: '#,##0.00;-#,##0.00' };
const DATE_FORMAT = { type: 'DATE', pattern: 'dd/mm/yyyy' };

/** Sheets counts days from 30/12/1899, so a date is that many days as a plain number. */
const SHEETS_EPOCH = parseCalendarDate('1899-12-30', 'YYYY-MM-DD');

function serialOf(date: CalendarDate): number {
  return SHEETS_EPOCH.ok ? daysBetween(SHEETS_EPOCH.value, date) : 0;
}

/** Whole cents as a number with two decimals. The decimal text is exact; JSON writes it back as is. */
function amountValue(cents: Cents): number {
  const sign = cents < 0 ? '-' : '';
  const size = String(Math.abs(cents)).padStart(3, '0');
  return Number(`${sign}${size.slice(0, -2)}.${size.slice(-2)}`);
}

/** A cell for the RAW write. Formulas are left blank here and written on their own. */
export function rawValue(cell: SheetCell): string | number {
  switch (cell.kind) {
    case 'text':
      return cell.text;
    case 'amount':
      return amountValue(cell.cents);
    case 'date':
      return serialOf(cell.date);
    case 'formula':
    case 'empty':
      return '';
  }
}

function statusFailure(status: number): GoogleFailure {
  if (status === 401) return 'needs-sign-in';
  if (status === 404) return 'not-found';
  return 'failed';
}

const idOnly = z.object({ id: z.string().min(1) });

const tabsResponse = z.object({
  sheets: z
    .array(
      z.object({
        properties: z.object({ sheetId: z.number().int(), title: z.string() }),
        developerMetadata: z
          .array(z.object({ metadataKey: z.string(), metadataValue: z.string().optional() }))
          .optional(),
        protectedRanges: z
          .array(
            z.object({
              protectedRangeId: z.number().int(),
              description: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .default([]),
});

const permissionsResponse = z.object({
  permissions: z
    .array(
      z.object({
        id: z.string(),
        emailAddress: z.string().optional(),
        role: z.string(),
        type: z.string(),
      }),
    )
    .default([]),
});

function driveRole(role: string): DrivePermission['role'] {
  return role === 'reader' || role === 'commenter' || role === 'writer' || role === 'owner'
    ? role
    : 'other';
}

function gridRange(write: TabWrite, rows: number, fromRow = 0, column?: number) {
  return {
    sheetId: write.sheetId,
    startRowIndex: fromRow,
    endRowIndex: rows,
    startColumnIndex: column ?? 0,
    endColumnIndex: column === undefined ? write.columns : column + 1,
  };
}

/** The batchUpdate requests for a plan, in the order Sheets needs them. */
export function structureRequests(plan: WorkbookPlan): unknown[] {
  return [
    ...plan.addTabs.flatMap((t) => [
      { addSheet: { properties: { sheetId: t.sheetId, title: t.title } } },
      {
        createDeveloperMetadata: {
          developerMetadata: {
            metadataKey: TAB_MARKER,
            metadataValue: t.key,
            location: { sheetId: t.sheetId },
            visibility: 'DOCUMENT',
          },
        },
      },
    ]),
    ...plan.removeTabs.map((sheetId) => ({ deleteSheet: { sheetId } })),
    ...plan.removeProtections.map((protectedRangeId) => ({
      deleteProtectedRange: { protectedRangeId },
    })),
    ...plan.writes.flatMap((w) => [
      // Clears the app's range only: values and number formats, never his columns or rows.
      {
        updateCells: {
          range: gridRange(w, w.clearRows),
          fields: 'userEnteredValue,userEnteredFormat.numberFormat',
        },
      },
      ...w.formats.map((f) => ({
        repeatCell: {
          range: gridRange(w, w.rows.length, f.fromRow, f.column),
          cell: {
            userEnteredFormat: { numberFormat: f.kind === 'amount' ? AMOUNT_FORMAT : DATE_FORMAT },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      })),
      {
        addProtectedRange: {
          protectedRange: {
            range: gridRange(w, Math.max(w.rows.length, 1)),
            description: PROTECTION_MARK,
            warningOnly: false,
            unprotectedRanges:
              w.editable === null
                ? []
                : w.editable.columns.map((column) =>
                    gridRange(w, w.rows.length, w.editable?.fromRow, column),
                  ),
          },
        },
      },
    ]),
  ];
}

/** The RAW values, and the app's own formulas cell by cell. */
export function valueWrites(plan: WorkbookPlan): {
  raw: { range: string; values: (string | number)[][] }[];
  formulas: { range: string; values: string[][] }[];
} {
  const raw = plan.writes
    .filter((w) => w.rows.length > 0)
    .map((w) => ({
      range: a1Range(w.title, w.columns, w.rows.length),
      values: w.rows.map((row) =>
        Array.from({ length: w.columns }, (_, c) => {
          const cell = row[c];
          return cell === undefined ? '' : rawValue(cell);
        }),
      ),
    }));
  const formulas = plan.writes.flatMap((w) =>
    w.rows.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.kind === 'formula' ? [{ range: cellA1(w.title, c, r), values: [[cell.formula]] }] : [],
      ),
    ),
  );
  return { raw, formulas };
}

export function createHttpGoogle(
  fetchFn: Fetch,
  accessToken: () => Promise<Result<string, GoogleFailure>>,
): GoogleApi {
  async function call(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<Result<unknown, GoogleFailure>> {
    const token = await accessToken();
    if (!token.ok) return token;
    let response: Response;
    try {
      response = await fetchFn(url, {
        method,
        headers: {
          Authorization: `Bearer ${token.value}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      return err('offline');
    }
    if (!response.ok) return err(statusFailure(response.status));
    if (response.status === 204) return ok(null);
    return ok(await response.json().catch(() => null));
  }

  async function parsed<T>(
    schema: z.ZodType<T>,
    result: Promise<Result<unknown, GoogleFailure>>,
  ): Promise<Result<T, GoogleFailure>> {
    const r = await result;
    if (!r.ok) return r;
    const checked = schema.safeParse(r.value);
    return checked.success ? ok(checked.data) : err('failed');
  }

  const permissionUrl = (fileId: string) =>
    `${DRIVE}/files/${encodeURIComponent(fileId)}/permissions`;

  return {
    async email() {
      const about = await parsed(
        z.object({ user: z.object({ emailAddress: z.string().optional() }).optional() }),
        call('GET', `${DRIVE}/about?fields=user(emailAddress)`),
      );
      return about.ok ? ok(about.value.user?.emailAddress ?? null) : about;
    },

    async ensureFolder(name) {
      const q = `mimeType='${FOLDER_TYPE}' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
      const found = await parsed(
        z.object({ files: z.array(idOnly).default([]) }),
        call(
          'GET',
          `${DRIVE}/files?${new URLSearchParams({ q, fields: 'files(id)', spaces: 'drive' }).toString()}`,
        ),
      );
      if (!found.ok) return found;
      const first = found.value.files[0];
      if (first !== undefined) return ok(first.id);
      const made = await parsed(
        idOnly,
        call('POST', `${DRIVE}/files?fields=id`, { name, mimeType: FOLDER_TYPE }),
      );
      return made.ok ? ok(made.value.id) : made;
    },

    async createSpreadsheet(title, folderId) {
      const made = await parsed(
        idOnly,
        call('POST', `${DRIVE}/files?fields=id`, {
          name: title,
          mimeType: SHEET_TYPE,
          parents: [folderId],
        }),
      );
      return made.ok ? ok(made.value.id) : made;
    },

    async fileState(fileId): Promise<Result<FileState, GoogleFailure>> {
      const got = await parsed(
        z.object({
          trashed: z.boolean().default(false),
          modifiedTime: z.string(),
          lastModifyingUser: z.object({ emailAddress: z.string().optional() }).optional(),
        }),
        call(
          'GET',
          `${DRIVE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent('trashed,modifiedTime,lastModifyingUser(emailAddress)')}`,
        ),
      );
      if (!got.ok) return got;
      return ok({
        trashed: got.value.trashed,
        modifiedTime: got.value.modifiedTime,
        modifiedBy: got.value.lastModifyingUser?.emailAddress ?? null,
      });
    },

    async tabs(fileId) {
      const fields =
        'sheets(properties(sheetId,title),developerMetadata(metadataKey,metadataValue),protectedRanges(protectedRangeId,description))';
      const got = await parsed(
        tabsResponse,
        call('GET', `${SHEETS}/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`),
      );
      if (!got.ok) return got;
      return ok(
        got.value.sheets.map((s) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
          key:
            s.developerMetadata?.find((m) => m.metadataKey === TAB_MARKER)?.metadataValue ?? null,
          protectionIds: (s.protectedRanges ?? [])
            .filter((p) => p.description === PROTECTION_MARK)
            .map((p) => p.protectedRangeId),
        })),
      );
    },

    async write(fileId, plan) {
      const id = encodeURIComponent(fileId);
      const structure = await call('POST', `${SHEETS}/${id}:batchUpdate`, {
        requests: structureRequests(plan),
      });
      if (!structure.ok) return structure;
      const { raw, formulas } = valueWrites(plan);
      if (raw.length > 0) {
        const written = await call('POST', `${SHEETS}/${id}/values:batchUpdate`, {
          valueInputOption: 'RAW',
          data: raw,
        });
        if (!written.ok) return written;
      }
      if (formulas.length > 0) {
        const written = await call('POST', `${SHEETS}/${id}/values:batchUpdate`, {
          valueInputOption: 'USER_ENTERED',
          data: formulas,
        });
        if (!written.ok) return written;
      }
      return ok(undefined);
    },

    async read(fileId, ranges) {
      const query = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' });
      for (const range of ranges) query.append('ranges', range);
      const got = await parsed(
        z.object({
          valueRanges: z
            .array(z.object({ values: z.array(z.array(z.unknown())).optional() }))
            .default([]),
        }),
        call('GET', `${SHEETS}/${encodeURIComponent(fileId)}/values:batchGet?${query.toString()}`),
      );
      if (!got.ok) return got;
      return ok(
        got.value.valueRanges.map((r) =>
          (r.values ?? []).map((row) => row.map((v) => (typeof v === 'string' ? v : String(v)))),
        ),
      );
    },

    async permissions(fileId) {
      const got = await parsed(
        permissionsResponse,
        call('GET', `${permissionUrl(fileId)}?fields=permissions(id,emailAddress,role,type)`),
      );
      if (!got.ok) return got;
      return ok(
        got.value.permissions.map((p) => ({
          id: p.id,
          email: p.type === 'user' ? (p.emailAddress ?? null) : null,
          role: driveRole(p.role),
        })),
      );
    },

    async share(fileId, email, role: DriveRole) {
      const r = await call('POST', `${permissionUrl(fileId)}?sendNotificationEmail=true`, {
        type: 'user',
        role,
        emailAddress: email,
      });
      return r.ok ? ok(undefined) : r;
    },

    async changeRole(fileId, permissionId, role) {
      const r = await call(
        'PATCH',
        `${permissionUrl(fileId)}/${encodeURIComponent(permissionId)}`,
        {
          role,
        },
      );
      return r.ok ? ok(undefined) : r;
    },

    async unshare(fileId, permissionId) {
      const r = await call(
        'DELETE',
        `${permissionUrl(fileId)}/${encodeURIComponent(permissionId)}`,
      );
      return r.ok ? ok(undefined) : r;
    },
  };
}
