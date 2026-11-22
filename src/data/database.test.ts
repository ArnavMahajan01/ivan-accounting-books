import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTimestamp } from '@shared/dates';
import { BOOKS_FILE_NAME, bundledMigrations, openStore } from './database';
import { createTestDatabase } from './test-database';

const t = parseTimestamp('2026-11-22T00:00:00.000Z');
const now = () => {
  if (!t.ok) throw new Error('bad timestamp');
  return t.value;
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'books-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('openStore', () => {
  it('creates the books file with foreign keys and WAL on, at schema version 1', () => {
    const migrations = bundledMigrations();
    if (!migrations.ok) throw new Error(migrations.error.message);
    const store = openStore(join(dir, BOOKS_FILE_NAME), migrations.value, now);
    if (!store.ok) throw new Error(store.error.message);
    expect(store.value.schemaVersion).toBe(1);
    expect(store.value.db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(store.value.db.pragma('journal_mode', { simple: true })).toBe('wal');
    store.value.close();
  });

  it('opens the same file again without reapplying anything', () => {
    const migrations = bundledMigrations();
    if (!migrations.ok) throw new Error(migrations.error.message);
    const path = join(dir, BOOKS_FILE_NAME);
    const first = openStore(path, migrations.value, now);
    if (first.ok) first.value.close();
    const second = openStore(path, migrations.value, now);
    expect(second.ok && second.value.schemaVersion).toBe(1);
    if (second.ok) second.value.close();
  });

  it('returns cannot-open for a folder it cannot write', () => {
    expect(openStore(join(dir, 'missing', 'books.db'), [], now)).toMatchObject({
      ok: false,
      error: { code: 'cannot-open' },
    });
  });
});

describe('createTestDatabase', () => {
  it('gives an in-memory database built from the real migrations', () => {
    const store = createTestDatabase();
    expect(store.schemaVersion).toBe(1);
    expect(store.db.name).toBe(':memory:');
    store.close();
  });
});
