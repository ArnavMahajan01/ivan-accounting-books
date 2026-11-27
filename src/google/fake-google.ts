// An in-memory Google for development and tests (folder 09). It behaves like the parts of Drive
// and Sheets the app uses: files, tabs with markers, protections, cells and sharing. Main uses it
// only in an unpackaged build started with GOOGLE_FAKE=1 (src/shared/env.ts), so the screens can
// be built and checked without a Google account. It never touches the network.
//
// Its little "Drive" is kept in a JSON file in the data folder, so links survive a restart while
// developing. `pretendEdit` plays the accountant typing into a cell.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { err, ok, type Result } from '@shared/result';
import type { GoogleStatus } from '@shared/sheets';
import { columnLetters } from '@domain/workbook';
import type { GoogleConnection } from './connection';
import { shownText, type DriveRole, type GoogleApi } from './google-api';
import type { GoogleFailure } from './oauth';

export const FAKE_OWNER = 'owner@example.com';

const tabSchema = z.object({
  sheetId: z.number(),
  title: z.string(),
  key: z.string().nullable(),
  protectionIds: z.array(z.number()),
  cells: z.record(z.string(), z.string()),
});
const fileSchema = z.object({
  id: z.string(),
  title: z.string(),
  folder: z.boolean(),
  trashed: z.boolean(),
  modifiedTime: z.string(),
  modifiedBy: z.string().nullable(),
  tabs: z.array(tabSchema),
  permissions: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      role: z.enum(['reader', 'commenter', 'writer']),
    }),
  ),
});
const driveSchema = z.object({ next: z.number(), files: z.array(fileSchema) });
type FakeFile = z.infer<typeof fileSchema>;
type FakeTab = z.infer<typeof tabSchema>;

export interface FakeGoogle {
  readonly api: GoogleApi;
  readonly connection: GoogleConnection;
  /** The accountant types `text` into one cell of a tab (found by its marker). */
  pretendEdit(
    fileId: string,
    tabKey: string,
    column: number,
    row: number,
    text: string,
    by: string,
  ): boolean;
  /** He deletes the workbook in Drive. */
  pretendTrash(fileId: string): void;
  /** Google stops honouring the sign-in, as when he removes the app from his Google account. */
  pretendRevoke(): void;
  /** A cell's text, as the sheet shows it. */
  cell(fileId: string, tabTitleOrKey: string, column: number, row: number): string | null;
  files(): readonly FakeFile[];
}

export interface FakeOptions {
  /** Where the fake Drive is kept between runs. Null keeps it in memory only (tests). */
  readonly path: string | null;
  /** The time, for Drive's "modified". */
  readonly now: () => string;
  readonly onStatus?: (status: GoogleStatus) => void;
}

const cellKey = (column: number, row: number) => `${columnLetters(column)}${String(row + 1)}`;

/** `'Tab'!A1:C9` back to its parts. */
function parseRange(range: string) {
  const m = /^'((?:[^']|'')*)'!([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(range);
  if (m === null) return null;
  // Column letters are A to Z only, so code units are safe here.
  const col = (letters: string) => {
    let n = 0;
    for (let i = 0; i < letters.length; i += 1) n = n * 26 + letters.charCodeAt(i) - 64;
    return n - 1;
  };
  const fromCol = col(m[2] ?? 'A');
  const fromRow = Number(m[3]) - 1;
  return {
    title: (m[1] ?? '').replace(/''/g, "'"),
    fromCol,
    fromRow,
    toCol: m[4] === undefined ? fromCol : col(m[4]),
    toRow: m[5] === undefined ? fromRow : Number(m[5]) - 1,
  };
}

export function createFakeGoogle(options: FakeOptions): FakeGoogle {
  let drive: z.infer<typeof driveSchema> = { next: 1, files: [] };
  if (options.path !== null && existsSync(options.path)) {
    try {
      const parsed = driveSchema.safeParse(JSON.parse(readFileSync(options.path, 'utf8')));
      if (parsed.success) drive = parsed.data;
    } catch {
      // A broken fake Drive starts again empty: it is development data only.
    }
  }
  let connected: GoogleStatus = { kind: 'not-connected' };
  const save = () => {
    if (options.path !== null) writeFileSync(options.path, JSON.stringify(drive));
  };
  const newId = (prefix: string) => `${prefix}${String((drive.next += 1))}`;
  const file = (id: string): Result<FakeFile, GoogleFailure> => {
    if (connected.kind !== 'connected') return err('needs-sign-in');
    const found = drive.files.find((f) => f.id === id);
    return found === undefined ? err('not-found') : ok(found);
  };
  const touch = (f: FakeFile, by: string | null) => {
    f.modifiedTime = options.now();
    f.modifiedBy = by;
  };
  const signedIn = (): Result<void, GoogleFailure> =>
    connected.kind === 'connected' ? ok(undefined) : err('needs-sign-in');
  const findTab = (f: FakeFile, titleOrKey: string): FakeTab | undefined =>
    f.tabs.find((t) => t.title === titleOrKey) ?? f.tabs.find((t) => t.key === titleOrKey);

  const api: GoogleApi = {
    email: () =>
      Promise.resolve(connected.kind === 'connected' ? ok(FAKE_OWNER) : err('needs-sign-in')),

    ensureFolder(name) {
      const s = signedIn();
      if (!s.ok) return Promise.resolve(s);
      const found = drive.files.find((f) => f.folder && f.title === name && !f.trashed);
      if (found !== undefined) return Promise.resolve(ok(found.id));
      const id = newId('folder-');
      drive.files.push({
        id,
        title: name,
        folder: true,
        trashed: false,
        modifiedTime: options.now(),
        modifiedBy: FAKE_OWNER,
        tabs: [],
        permissions: [],
      });
      save();
      return Promise.resolve(ok(id));
    },

    createSpreadsheet(title) {
      const s = signedIn();
      if (!s.ok) return Promise.resolve(s);
      const id = newId('sheet-');
      drive.files.push({
        id,
        title,
        folder: false,
        trashed: false,
        modifiedTime: options.now(),
        modifiedBy: FAKE_OWNER,
        tabs: [{ sheetId: 0, title: 'Sheet1', key: null, protectionIds: [], cells: {} }],
        permissions: [],
      });
      save();
      return Promise.resolve(ok(id));
    },

    fileState(fileId) {
      const f = file(fileId);
      return Promise.resolve(
        f.ok
          ? ok({
              trashed: f.value.trashed,
              modifiedTime: f.value.modifiedTime,
              modifiedBy: f.value.modifiedBy,
            })
          : f,
      );
    },

    tabs(fileId) {
      const f = file(fileId);
      if (!f.ok) return Promise.resolve(f);
      return Promise.resolve(
        ok(
          f.value.tabs.map((t) => ({
            sheetId: t.sheetId,
            title: t.title,
            key: t.key,
            protectionIds: t.protectionIds,
          })),
        ),
      );
    },

    write(fileId, plan) {
      const got = file(fileId);
      if (!got.ok) return Promise.resolve(got);
      const f = got.value;
      for (const add of plan.addTabs) {
        f.tabs.push({
          sheetId: add.sheetId,
          title: add.title,
          key: add.key,
          protectionIds: [],
          cells: {},
        });
      }
      f.tabs = f.tabs.filter((t) => !plan.removeTabs.includes(t.sheetId));
      for (const t of f.tabs) {
        t.protectionIds = t.protectionIds.filter((p) => !plan.removeProtections.includes(p));
      }
      for (const w of plan.writes) {
        const tab = f.tabs.find((t) => t.sheetId === w.sheetId);
        if (tab === undefined) return Promise.resolve(err('failed'));
        for (let r = 0; r < w.clearRows; r += 1) {
          for (let c = 0; c < w.columns; c += 1) {
            const key = cellKey(c, r);
            tab.cells = Object.fromEntries(Object.entries(tab.cells).filter(([k]) => k !== key));
          }
        }
        w.rows.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (c < w.columns && cell.kind !== 'empty') tab.cells[cellKey(c, r)] = shownText(cell);
          });
        });
        tab.protectionIds.push((drive.next += 1));
      }
      touch(f, FAKE_OWNER);
      save();
      return Promise.resolve(ok(undefined));
    },

    read(fileId, ranges) {
      const got = file(fileId);
      if (!got.ok) return Promise.resolve(got);
      const out: string[][][] = [];
      for (const range of ranges) {
        const parts = parseRange(range);
        const tab = parts === null ? undefined : findTab(got.value, parts.title);
        if (parts === null || tab === undefined) return Promise.resolve(err('failed'));
        const rows: string[][] = [];
        for (let r = parts.fromRow; r <= parts.toRow; r += 1) {
          const row: string[] = [];
          for (let c = parts.fromCol; c <= parts.toCol; c += 1)
            row.push(tab.cells[cellKey(c, r)] ?? '');
          rows.push(row);
        }
        // Like Sheets, trailing empty rows are not sent.
        while (rows.length > 0 && (rows.at(-1) ?? []).every((v) => v === '')) rows.pop();
        out.push(rows);
      }
      return Promise.resolve(ok(out));
    },

    permissions(fileId) {
      const f = file(fileId);
      if (!f.ok) return Promise.resolve(f);
      return Promise.resolve(
        ok([
          { id: 'owner', email: FAKE_OWNER, role: 'owner' as const },
          ...f.value.permissions.map((p) => ({ id: p.id, email: p.email, role: p.role })),
        ]),
      );
    },

    share(fileId, email, role: DriveRole) {
      const f = file(fileId);
      if (!f.ok) return Promise.resolve(f);
      const existing = f.value.permissions.find((p) => p.email === email);
      if (existing !== undefined) existing.role = role;
      else f.value.permissions.push({ id: newId('perm-'), email, role });
      save();
      return Promise.resolve(ok(undefined));
    },

    changeRole(fileId, permissionId, role) {
      const f = file(fileId);
      if (!f.ok) return Promise.resolve(f);
      const p = f.value.permissions.find((x) => x.id === permissionId);
      if (p === undefined) return Promise.resolve(err('not-found'));
      p.role = role;
      save();
      return Promise.resolve(ok(undefined));
    },

    unshare(fileId, permissionId) {
      const f = file(fileId);
      if (!f.ok) return Promise.resolve(f);
      f.value.permissions = f.value.permissions.filter((p) => p.id !== permissionId);
      save();
      return Promise.resolve(ok(undefined));
    },
  };

  const connection: GoogleConnection = {
    status: () => Promise.resolve(connected),
    connect() {
      connected = { kind: 'connected', email: FAKE_OWNER };
      options.onStatus?.(connected);
      return Promise.resolve(ok(connected));
    },
    disconnect() {
      connected = { kind: 'not-connected' };
      options.onStatus?.(connected);
      return Promise.resolve('disconnected' as const);
    },
    accessToken() {
      return Promise.resolve(
        connected.kind === 'connected' ? ok('fake-access') : err('needs-sign-in'),
      );
    },
  };

  return {
    api,
    connection,
    pretendEdit(fileId, tabKey, column, row, text, by) {
      const f = drive.files.find((x) => x.id === fileId);
      const tab = f?.tabs.find((t) => t.key === tabKey);
      if (f === undefined || tab === undefined) return false;
      tab.cells[cellKey(column, row)] = text;
      touch(f, by);
      save();
      return true;
    },
    pretendTrash(fileId) {
      const f = drive.files.find((x) => x.id === fileId);
      if (f !== undefined) f.trashed = true;
      save();
    },
    pretendRevoke() {
      if (connected.kind === 'connected') {
        connected = { kind: 'needs-sign-in', email: connected.email };
        options.onStatus?.(connected);
      }
    },
    cell(fileId, tabTitleOrKey, column, row) {
      const f = drive.files.find((x) => x.id === fileId);
      const tab = f === undefined ? undefined : findTab(f, tabTitleOrKey);
      return tab === undefined ? null : (tab.cells[cellKey(column, row)] ?? '');
    },
    files: () => drive.files,
  };
}
