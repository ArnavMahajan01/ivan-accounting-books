// The migration runner. Applies numbered `.sql` files in order, each in its own transaction,
// and records each with a hash of its text. It refuses to start if an applied migration's text
// changed or its file is gone, because the books would no longer match the code.

import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Timestamp } from '@shared/dates';
import type { StoreProblem } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export type MigrationErrorCode = Exclude<StoreProblem, 'cannot-open' | 'integrity-failed'>;

export interface MigrationError {
  readonly code: MigrationErrorCode;
  /** The migration it concerns, when there is one. */
  readonly version?: number;
  readonly message: string;
}

export interface MigrationReport {
  readonly applied: readonly number[];
  readonly schemaVersion: number;
}

const FILE_NAME = /^(?<version>\d{4})-(?<name>[a-z0-9-]+)\.sql$/;

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Turns `{ 'path/0001-init.sql': text }` into ordered migrations, checking names and numbers. */
export function migrationsFromFiles(
  files: Readonly<Record<string, string>>,
): Result<Migration[], MigrationError> {
  const migrations: Migration[] = [];
  for (const [path, sql] of Object.entries(files)) {
    const fileName = path.split('/').at(-1) ?? path;
    const groups = FILE_NAME.exec(fileName)?.groups;
    if (groups?.version === undefined || groups.name === undefined) {
      return err({
        code: 'bad-migration-file-name',
        message: `Migration file "${fileName}" must be named like 0002-add-accounts.sql`,
      });
    }
    migrations.push({ version: Number(groups.version), name: groups.name, sql });
  }
  migrations.sort((a, b) => a.version - b.version);
  for (let i = 1; i < migrations.length; i += 1) {
    const version = migrations[i]?.version;
    if (version !== undefined && version === migrations[i - 1]?.version) {
      return err({
        code: 'duplicate-migration-version',
        version,
        message: `Two migration files have the number ${String(version)}`,
      });
    }
  }
  return ok(migrations);
}

interface AppliedRow {
  version: number;
  sha256: string;
}

function appliedMigrations(db: Database.Database): AppliedRow[] {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();
  if (table === undefined) return [];
  return db
    .prepare('SELECT version, sha256 FROM schema_migrations ORDER BY version')
    .all() as AppliedRow[];
}

export interface RunOptions {
  /**
   * Called once, before the first new migration, when the file already has a schema
   * (spec 012: copy the books first). An error stops the run before anything changes.
   */
  readonly beforeApplying?: (fromVersion: number) => Result<void, MigrationError>;
}

/** Applies every migration not yet applied, in order. `now` stamps each one. */
export function runMigrations(
  db: Database.Database,
  migrations: readonly Migration[],
  now: () => Timestamp,
  options: RunOptions = {},
): Result<MigrationReport, MigrationError> {
  const byVersion = new Map(migrations.map((m) => [m.version, m]));
  const applied = appliedMigrations(db);

  for (const row of applied) {
    const migration = byVersion.get(row.version);
    if (migration === undefined) {
      return err({
        code: 'applied-migration-missing',
        version: row.version,
        message: `Migration ${String(row.version)} was applied to these books, but its file is gone`,
      });
    }
    if (sha256(migration.sql) !== row.sha256) {
      return err({
        code: 'applied-migration-changed',
        version: row.version,
        message: `Migration ${String(row.version)}-${migration.name} was changed after it was applied. Restore it and add a new migration instead`,
      });
    }
  }

  const appliedVersions = new Set(applied.map((r) => r.version));
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));
  if (pending.length > 0 && applied.length > 0 && options.beforeApplying !== undefined) {
    const ready = options.beforeApplying(schemaVersion(db));
    if (!ready.ok) return ready;
  }
  const newlyApplied: number[] = [];
  for (const migration of pending) {
    const apply = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, sha256, applied_at) VALUES (?, ?, ?, ?)',
      ).run(migration.version, migration.name, sha256(migration.sql), now());
      db.prepare(
        "INSERT INTO app_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      ).run(String(migration.version));
    });
    try {
      apply();
    } catch (cause) {
      return err({
        code: 'migration-failed',
        version: migration.version,
        message: `Migration ${String(migration.version)}-${migration.name} failed: ${cause instanceof Error ? cause.message : 'unknown error'}`,
      });
    }
    newlyApplied.push(migration.version);
  }

  return ok({ applied: newlyApplied, schemaVersion: schemaVersion(db) });
}

/** The schema version recorded in app_meta, or 0 for an empty file. */
export function schemaVersion(db: Database.Database): number {
  if (appliedMigrations(db).length === 0) return 0;
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get() as
    { value: string } | undefined;
  return row === undefined ? 0 : Number(row.value);
}
