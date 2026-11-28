// Backups in the main process (specs 136 to 138): where they go, the key in the Keychain, making
// one now, by itself each day and after an import, listing them, and restoring one. The folder
// and the daily choice are kept in `backup-settings.json` beside the window size; when the books
// were last backed up is kept in the books themselves (`services/backup-record.ts`).

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { listBackups, makeBackup, prepareRestore, pruneBackups } from '@backup/backups';
import { KEY_BYTES } from '@backup/backup-file';
import { parseRecoveryKey, recoveryKeyText } from '@backup/recovery-key';
import type { OpenError, Store } from '@data/database';
import { lastBackupAt, recordBackup } from '@services/backup-record';
import { parseTimestamp, type Clock } from '@shared/dates';
import type { Logger } from '@shared/logger';
import type { Result } from '@shared/result';
import type {
  BackupNowOutcome,
  BackupRow,
  BackupStatus,
  RestoreOutcome,
  TurnOnOutcome,
} from '@shared/settings';
import type { BooksSession } from './books-session';

export const BACKUP_SETTINGS_FILE = 'backup-settings.json';
export const BACKUP_KEY_FILE = 'backup-key.bin';
/** A daily backup is due once the last one is this old. */
const DAY_MS = 24 * 60 * 60 * 1000;

const settingsSchema = z.object({ folder: z.string().min(1).nullable(), daily: z.boolean() });
type BackupSettings = z.infer<typeof settingsSchema>;

/** What main gives from `safeStorage`, as for the Google sign-in. */
export interface KeyCipher {
  isAvailable(): Promise<boolean>;
  encrypt(text: string): Promise<Buffer>;
  decrypt(data: Buffer): Promise<string>;
}

export interface BackupManagerDeps {
  readonly dataDir: string;
  readonly books: Pick<BooksSession, 'store' | 'mode' | 'replaceBooks'>;
  readonly cipher: KeyCipher;
  readonly clock: Clock;
  readonly appVersion: string;
  readonly log: Logger;
  /** "2026-11-28 0914" on this Mac's clock, for the file name. */
  readonly localStamp: () => string;
  readonly chooseFolder: () => Promise<string | null>;
  readonly openBooks: (path: string) => Result<Store, OpenError>;
}

export interface BackupManager {
  status(): Promise<BackupStatus>;
  chooseFolder(): Promise<{ folderName: string | null }>;
  turnOn(): Promise<TurnOnOutcome>;
  recoveryKey(): Promise<string | null>;
  setDaily(on: boolean): BackupStatus['daily'];
  backupNow(): Promise<BackupNowOutcome>;
  /** The daily backup, if it is on and due. */
  runIfDue(): Promise<void>;
  /** After an import, if backups are on (spec 137). */
  afterImport(): Promise<void>;
  list(): BackupRow[];
  restore(name: string, recovery: string | null): Promise<RestoreOutcome>;
}

export function createBackupManager(deps: BackupManagerDeps): BackupManager {
  const settingsPath = join(deps.dataDir, BACKUP_SETTINGS_FILE);
  const keyPath = join(deps.dataDir, BACKUP_KEY_FILE);
  let running = false;

  const settings = (): BackupSettings => {
    try {
      const parsed = settingsSchema.safeParse(JSON.parse(readFileSync(settingsPath, 'utf8')));
      return parsed.success ? parsed.data : { folder: null, daily: false };
    } catch {
      return { folder: null, daily: false };
    }
  };
  const save = (next: BackupSettings) => {
    writeFileSync(settingsPath, `${JSON.stringify(next)}\n`, { mode: 0o600 });
  };

  const loadKey = async (): Promise<Buffer | null> => {
    if (!existsSync(keyPath) || !(await deps.cipher.isAvailable())) return null;
    try {
      const key = Buffer.from(await deps.cipher.decrypt(readFileSync(keyPath)), 'base64');
      return key.length === KEY_BYTES ? key : null;
    } catch {
      return null;
    }
  };

  const status = async (): Promise<BackupStatus> => {
    const s = settings();
    const store = deps.books.store();
    return {
      folderName: s.folder === null ? null : basename(s.folder),
      daily: s.daily,
      lastBackupAt: store.ok ? lastBackupAt({ db: store.value.db }) : null,
      keyReady: (await loadKey()) !== null,
    };
  };

  const backupNow = async (): Promise<BackupNowOutcome> => {
    const s = settings();
    if (s.folder === null) return { kind: 'refused', reason: 'no-folder' };
    if (!(await deps.cipher.isAvailable())) return { kind: 'refused', reason: 'no-keychain' };
    const key = await loadKey();
    if (key === null) return { kind: 'refused', reason: 'no-key' };
    const store = deps.books.store();
    if (!store.ok) return { kind: 'refused', reason: 'books-closed' };
    const at = deps.clock.now();
    const made = await makeBackup({
      store: store.value,
      mode: deps.books.mode(),
      key,
      folder: s.folder,
      workDir: deps.dataDir,
      createdAt: at,
      localStamp: deps.localStamp(),
      appVersion: deps.appVersion,
    });
    if (!made.ok) {
      deps.log.warn('backup.failed', { code: made.error });
      return { kind: 'refused', reason: made.error === 'no-folder' ? 'no-folder' : 'not-written' };
    }
    recordBackup({ db: store.value.db }, at);
    const removed = pruneBackups(s.folder, deps.clock.today(), deps.books.mode());
    deps.log.info('backup.made', { removed });
    return { kind: 'done', fileName: made.value.fileName, at };
  };

  return {
    status,

    async chooseFolder() {
      const folder = await deps.chooseFolder();
      if (folder === null) {
        const kept = settings().folder;
        return { folderName: kept === null ? null : basename(kept) };
      }
      save({ ...settings(), folder });
      return { folderName: basename(folder) };
    },

    async turnOn() {
      if (settings().folder === null) return { kind: 'refused', reason: 'no-folder' };
      if (!(await deps.cipher.isAvailable())) return { kind: 'refused', reason: 'no-keychain' };
      let key = await loadKey();
      if (key === null) {
        key = randomBytes(KEY_BYTES);
        writeFileSync(keyPath, await deps.cipher.encrypt(key.toString('base64')), { mode: 0o600 });
      }
      save({ ...settings(), daily: true });
      return { kind: 'on', recoveryKey: recoveryKeyText(key) };
    },

    async recoveryKey() {
      const key = await loadKey();
      return key === null ? null : recoveryKeyText(key);
    },

    setDaily(on) {
      save({ ...settings(), daily: on });
      return on;
    },

    backupNow,

    async runIfDue() {
      const s = settings();
      if (!s.daily || s.folder === null || running) return;
      const store = deps.books.store();
      const last = store.ok ? lastBackupAt({ db: store.value.db }) : null;
      if (last !== null && Date.parse(deps.clock.now()) - Date.parse(last) < DAY_MS) return;
      running = true;
      try {
        await backupNow();
      } finally {
        running = false;
      }
    },

    async afterImport() {
      const s = settings();
      if (!s.daily || s.folder === null || running) return;
      running = true;
      try {
        await backupNow();
      } finally {
        running = false;
      }
    },

    list() {
      const folder = settings().folder;
      if (folder === null) return [];
      return listBackups(folder)
        .filter((b) => b.header.mode === deps.books.mode())
        .map((b) => ({
          name: b.name,
          createdAt: b.header.createdAt,
          entries: b.header.entries,
          bytes: b.bytes,
        }));
    },

    async restore(name, recovery) {
      const folder = settings().folder;
      if (folder === null) return { kind: 'refused', reason: 'no-folder' };
      let key: Buffer | null;
      if (recovery !== null) {
        const parsed = parseRecoveryKey(recovery);
        if (!parsed.ok) return { kind: 'refused', reason: 'bad-recovery-key' };
        key = parsed.value;
      } else {
        key = await loadKey();
        if (key === null) return { kind: 'refused', reason: 'needs-recovery-key' };
      }
      const prepared = prepareRestore({
        folder,
        name,
        key,
        mode: deps.books.mode(),
        workDir: deps.dataDir,
        openBooks: deps.openBooks,
      });
      if (!prepared.ok) {
        // A backup made with another Mac's key: his recovery key opens it.
        if (prepared.error === 'wrong-key' && recovery === null) {
          return { kind: 'refused', reason: 'needs-recovery-key' };
        }
        deps.log.warn('backup.restore-refused', { code: prepared.error });
        return { kind: 'refused', reason: prepared.error };
      }
      const replaced = deps.books.replaceBooks(prepared.value.path);
      rmSync(prepared.value.path, { force: true });
      if (!replaced.ok) return { kind: 'refused', reason: 'failed' };
      // The restored books were copied before their backup was recorded: they are that backup.
      const restored = deps.books.store();
      const madeAt = parseTimestamp(prepared.value.header.createdAt);
      if (restored.ok && madeAt.ok) recordBackup({ db: restored.value.db }, madeAt.value);
      return { kind: 'restored', entries: prepared.value.entries };
    },
  };
}

/** For the Mac's clock: "2026-11-28 0914". */
export function localStampOf(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}${two(date.getMinutes())}`;
}
