// Copies the books before any migration, so a failed update can never lose them (risk L4).
// `VACUUM INTO` writes one consistent file that includes anything still in the WAL file.

import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import type { Timestamp } from '@shared/dates';
import { err, ok, type Result } from '@shared/result';
import type { MigrationError } from './migrations';

export const PRE_MIGRATION_DIR = 'pre-migration';
export const KEPT_PRE_MIGRATION_COPIES = 5;

const COPY_NAME = /^books-(?<version>\d+)-(?<time>\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.db$/;

/** `books-1-2026-11-22T06-30-43-292Z.db`: colons and points are not safe in every file name. */
export function preMigrationCopyName(version: number, time: Timestamp): string {
  return `books-${String(version)}-${time.replace(/[:.]/g, '-')}.db`;
}

/** Deletes the oldest copies, keeping `keep`. Only files named by this module are touched. */
export function pruneCopies(dir: string, keep: number): void {
  const copies = readdirSync(dir)
    .map((name) => ({ name, time: COPY_NAME.exec(name)?.groups?.time }))
    .filter((c): c is { name: string; time: string } => c.time !== undefined)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  for (const old of copies.slice(0, Math.max(0, copies.length - keep))) {
    rmSync(join(dir, old.name));
  }
}

/** Writes the copy into `<dataDir>/pre-migration/` and keeps the newest five. Returns its path. */
export function copyBeforeMigrating(
  db: Database.Database,
  dataDir: string,
  fromVersion: number,
  now: Timestamp,
): Result<string, MigrationError> {
  const dir = join(dataDir, PRE_MIGRATION_DIR);
  const path = join(dir, preMigrationCopyName(fromVersion, now));
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    db.prepare('VACUUM INTO ?').run(path);
    pruneCopies(dir, KEPT_PRE_MIGRATION_COPIES);
  } catch (cause) {
    return err({
      code: 'pre-migration-copy-failed',
      version: fromVersion,
      message: `Could not copy the books before updating them: ${cause instanceof Error ? cause.message : 'unknown error'}`,
    });
  }
  return ok(path);
}
