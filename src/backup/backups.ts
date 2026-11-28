// Making, listing and opening backups in the folder he chose (specs 136, 138). Main calls these
// with the open books, the key from the Keychain and the clock; nothing here imports Electron.
// Only files whose names this app writes are ever read or removed in that folder.

import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { copyDatabaseTo, type OpenError, type Store } from '@data/database';
import { countJournalEntries } from '@data/journal-queries';
import { checkBooks } from '@services/check-books';
import type { CalendarDate } from '@shared/dates';
import { err, ok, type Result } from '@shared/result';
import {
  openBackup,
  readBackupHeader,
  sealBackup,
  type BackupHeader,
  type BackupReadError,
} from './backup-file';
import { backupsToRemove } from './retention';

export const BACKUP_EXTENSION = '.abbackup';
/** "Accounting Books 2026-11-28 0914.abbackup", or with "sample" for the sample books. */
const NAME = /^Accounting Books (sample )?(\d{4}-\d{2}-\d{2}) (\d{4})(?: \d+)?\.abbackup$/;

export function isBackupName(name: string): boolean {
  return NAME.test(name);
}

export interface MadeBackup {
  readonly fileName: string;
  readonly header: BackupHeader;
}

export async function makeBackup(input: {
  readonly store: Store;
  readonly mode: 'real' | 'sample';
  readonly key: Buffer;
  readonly folder: string;
  /** Where the plain copy is made for a moment: the app's own data folder, never his. */
  readonly workDir: string;
  readonly createdAt: string;
  /** "2026-11-28 0914", on this Mac's clock. */
  readonly localStamp: string;
  readonly appVersion: string;
}): Promise<Result<MadeBackup, 'no-folder' | 'not-written'>> {
  if (!existsSync(input.folder)) return err('no-folder');
  const plain = join(input.workDir, `backup-in-progress-${randomBytes(6).toString('hex')}.db`);
  try {
    await copyDatabaseTo(input.store.db, plain);
    const header: BackupHeader = {
      createdAt: input.createdAt,
      appVersion: input.appVersion,
      schemaVersion: input.store.schemaVersion,
      entries: countJournalEntries(input.store.db),
      mode: input.mode,
    };
    const sealed = sealBackup(readFileSync(plain), header, input.key, randomBytes(12));
    const base = `Accounting Books ${input.mode === 'sample' ? 'sample ' : ''}${input.localStamp}`;
    let fileName = `${base}.abbackup`;
    for (let n = 2; existsSync(join(input.folder, fileName)); n += 1) {
      fileName = `${base} ${String(n)}.abbackup`;
    }
    writeFileSync(join(input.folder, fileName), sealed, { mode: 0o600, flag: 'wx' });
    return ok({ fileName, header });
  } catch {
    return err('not-written');
  } finally {
    rmSync(plain, { force: true });
  }
}

export interface BackupListing {
  readonly name: string;
  readonly header: BackupHeader;
  readonly bytes: number;
}

/** The backups in the folder, newest first, read from their headers only. */
export function listBackups(folder: string): BackupListing[] {
  let names: string[];
  try {
    names = readdirSync(folder).filter(isBackupName);
  } catch {
    return [];
  }
  return names
    .flatMap((name): BackupListing[] => {
      const path = join(folder, name);
      try {
        const fd = openSync(path, 'r');
        const head = Buffer.alloc(4096);
        const read = readSync(fd, head, 0, head.length, 0);
        closeSync(fd);
        // Enough for the header; the body is checked when it is opened.
        const padded = Buffer.concat([head.subarray(0, read), Buffer.alloc(64)]);
        const parsed = readBackupHeader(padded);
        return parsed.ok ? [{ name, header: parsed.value.header, bytes: statSync(path).size }] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => (a.header.createdAt < b.header.createdAt ? 1 : -1));
}

/** Removes the backups the keeping rule no longer needs (daily for a week, weekly for a month). */
export function pruneBackups(folder: string, today: CalendarDate, mode: 'real' | 'sample'): number {
  const mine = listBackups(folder).filter((b) => b.header.mode === mode);
  const remove = backupsToRemove(
    mine.flatMap((b) => {
      const day = NAME.exec(b.name)?.[2];
      return day === undefined
        ? []
        : [{ name: b.name, day: day as CalendarDate, at: b.header.createdAt }];
    }),
    today,
  );
  for (const name of remove) rmSync(join(folder, name), { force: true });
  return remove.length;
}

export type PrepareError = BackupReadError | 'other-mode' | 'unreadable' | 'checks-failed';

/**
 * Decrypts a backup into a new file in the work folder and checks it: it opens (migrations run),
 * passes SQLite's integrity check and the books check. Only then may it replace the books. On
 * any failure the file is removed and nothing else changes.
 */
export function prepareRestore(input: {
  readonly folder: string;
  readonly name: string;
  readonly key: Buffer;
  readonly mode: 'real' | 'sample';
  readonly workDir: string;
  readonly openBooks: (path: string) => Result<Store, OpenError>;
}): Result<{ path: string; header: BackupHeader; entries: number }, PrepareError> {
  if (!isBackupName(input.name)) return err('not-a-backup');
  let file: Buffer;
  try {
    file = readFileSync(join(input.folder, input.name));
  } catch {
    return err('unreadable');
  }
  const opened = openBackup(file, input.key);
  if (!opened.ok) return opened;
  if (opened.value.header.mode !== input.mode) return err('other-mode');
  const path = join(input.workDir, `restore-${randomBytes(6).toString('hex')}.db`);
  writeFileSync(path, opened.value.books, { mode: 0o600 });
  const store = input.openBooks(path);
  if (!store.ok) {
    rmSync(path, { force: true });
    return err('checks-failed');
  }
  const health = checkBooks({ db: store.value.db });
  store.value.close();
  if (health.problems.length > 0) {
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${path}${suffix}`, { force: true });
    return err('checks-failed');
  }
  return ok({ path, header: opened.value.header, entries: health.entries });
}
