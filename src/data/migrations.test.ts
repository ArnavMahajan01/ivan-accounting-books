import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { parseTimestamp, type Timestamp } from '@shared/dates';
import { bundledMigrations } from './database';
import { migrationsFromFiles, runMigrations, schemaVersion, type Migration } from './migrations';

function time(text: string): Timestamp {
  const r = parseTimestamp(text);
  if (!r.ok) throw new Error('bad timestamp');
  return r.value;
}
const now = () => time('2026-11-22T00:00:00.000Z');

function migrations(files: Record<string, string>): Migration[] {
  const r = migrationsFromFiles(files);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function real(): Migration[] {
  const r = bundledMigrations();
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}
const realVersions = () => real().map((m) => m.version);
const latest = () => real().at(-1)?.version ?? 0;

// Invented migrations are numbered from 9001, so they never collide with a real one.
const extra = {
  './migrations/9001-sample.sql': 'CREATE TABLE sample (id TEXT PRIMARY KEY) STRICT;',
};

describe('migrationsFromFiles', () => {
  it('orders migrations by number', () => {
    const list = migrations({ 'm/0002-b.sql': 'select 2', 'm/0001-a.sql': 'select 1' });
    expect(list.map((m) => [m.version, m.name])).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it.each(['m/1-init.sql', 'm/0001_init.sql', 'm/0001-Init.sql', 'm/0001-init.txt'])(
    'refuses the file name %s',
    (path) => {
      expect(migrationsFromFiles({ [path]: '' })).toMatchObject({
        ok: false,
        error: { code: 'bad-migration-file-name' },
      });
    },
  );

  it('refuses two files with the same number', () => {
    expect(migrationsFromFiles({ 'm/0001-a.sql': '', 'm/0001-b.sql': '' })).toMatchObject({
      ok: false,
      error: { code: 'duplicate-migration-version', version: 1 },
    });
  });

  it('finds the real migrations, starting with 0001-init', () => {
    expect(real()[0]).toMatchObject({ version: 1, name: 'init' });
  });
});

describe('runMigrations', () => {
  it('applies the real migrations to an empty file, up to the latest version', () => {
    const db = new Database(':memory:');
    expect(schemaVersion(db)).toBe(0);
    expect(runMigrations(db, real(), now)).toEqual({
      ok: true,
      value: { applied: realVersions(), schemaVersion: latest() },
    });
    const row = db
      .prepare('SELECT version, name, applied_at FROM schema_migrations WHERE version = 1')
      .get();
    expect(row).toEqual({ version: 1, name: 'init', applied_at: '2026-11-22T00:00:00.000Z' });
  });

  it('applies nothing the second time', () => {
    const db = new Database(':memory:');
    runMigrations(db, real(), now);
    expect(runMigrations(db, real(), now)).toEqual({
      ok: true,
      value: { applied: [], schemaVersion: latest() },
    });
  });

  it('applies only the new migrations, in order', () => {
    const db = new Database(':memory:');
    runMigrations(db, real(), now);
    const more = [...real(), ...migrations(extra)];
    expect(runMigrations(db, more, now)).toEqual({
      ok: true,
      value: { applied: [9001], schemaVersion: 9001 },
    });
  });

  it('refuses to start if an applied migration was edited', () => {
    const db = new Database(':memory:');
    runMigrations(db, real(), now);
    const edited = real().map((m) => (m.version === 1 ? { ...m, sql: `${m.sql}\n-- edited` } : m));
    const result = runMigrations(db, edited, now);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'applied-migration-changed', version: 1 },
    });
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Migration 1-init was changed after it was applied. Restore it and add a new migration instead',
      );
    }
  });

  it('refuses to start if an applied migration file is gone', () => {
    const db = new Database(':memory:');
    runMigrations(db, [...real(), ...migrations(extra)], now);
    expect(runMigrations(db, real(), now)).toMatchObject({
      ok: false,
      error: { code: 'applied-migration-missing', version: 9001 },
    });
  });

  it('rolls a failing migration back completely, and records nothing for it', () => {
    const db = new Database(':memory:');
    runMigrations(db, real(), now);
    const broken = migrations({
      'm/9001-broken.sql':
        'CREATE TABLE half (id TEXT) STRICT; INSERT INTO missing_table VALUES (1);',
    });
    expect(runMigrations(db, [...real(), ...broken], now)).toMatchObject({
      ok: false,
      error: { code: 'migration-failed', version: 9001 },
    });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'half'").get()).toBeUndefined();
    expect(schemaVersion(db)).toBe(latest());
    expect(db.prepare('SELECT count(*) AS n FROM schema_migrations').get()).toEqual({
      n: real().length,
    });
  });
});
