// Opens the books file. Only the main process does this (context/architecture-context.md).

import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Timestamp } from '@shared/dates';
import type { StoreProblem } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import {
  migrationsFromFiles,
  runMigrations,
  type Migration,
  type MigrationError,
} from './migrations';
import { copyBeforeMigrating } from './pre-migration-copy';

export const BOOKS_FILE_NAME = 'books.db';

/** The real migrations, bundled into the app as text so the packaged app cannot miss one. */
export function bundledMigrations(): Result<Migration[], MigrationError> {
  return migrationsFromFiles(
    import.meta.glob<string>('./migrations/*.sql', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  );
}

function mapCopy(copied: Result<string, MigrationError>): Result<void, MigrationError> {
  return copied.ok ? ok(undefined) : copied;
}

export interface OpenError {
  readonly code: StoreProblem;
  readonly message: string;
}

export interface Store {
  readonly db: Database.Database;
  readonly schemaVersion: number;
  close(): void;
}

/** `PRAGMA integrity_check` returns the single row "ok" when the file is sound. */
function integrityProblems(db: Database.Database): string[] {
  const rows = db.pragma('integrity_check') as { integrity_check: string }[];
  const messages = rows.map((r) => r.integrity_check);
  return messages.length === 1 && messages[0] === 'ok' ? [] : messages;
}

/**
 * Opens (or creates) a database, turns on foreign keys and WAL, copies it if it has data and
 * migrations are waiting, applies them, then checks the file's integrity. Any failure closes the
 * file, so the books are never opened in a doubtful state.
 */
export function openStore(
  path: string,
  migrations: readonly Migration[],
  now: () => Timestamp,
): Result<Store, OpenError> {
  let db: Database.Database;
  try {
    db = new Database(path);
  } catch (cause) {
    return err({
      code: 'cannot-open',
      message: cause instanceof Error ? cause.message : 'unknown error',
    });
  }
  const inMemory = path === ':memory:';
  let migrated: ReturnType<typeof runMigrations>;
  let problems: string[];
  try {
    db.pragma('foreign_keys = ON');
    if (!inMemory) db.pragma('journal_mode = WAL');
    migrated = runMigrations(db, migrations, now, {
      beforeApplying: (fromVersion) =>
        inMemory
          ? ok(undefined)
          : mapCopy(copyBeforeMigrating(db, dirname(path), fromVersion, now())),
    });
    problems = migrated.ok ? integrityProblems(db) : [];
  } catch (cause) {
    // A damaged file can fail on its first read instead of in the integrity check.
    db.close();
    return err({
      code: 'integrity-failed',
      message: `The books file is damaged: ${cause instanceof Error ? cause.message : 'unknown error'}`,
    });
  }
  if (!migrated.ok) {
    db.close();
    return err({ code: migrated.error.code, message: migrated.error.message });
  }
  if (problems.length > 0) {
    db.close();
    return err({
      code: 'integrity-failed',
      message: `The books file is damaged: ${problems.join('; ')}`,
    });
  }
  return ok({ db, schemaVersion: migrated.value.schemaVersion, close: () => db.close() });
}
