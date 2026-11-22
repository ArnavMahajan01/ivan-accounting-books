import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTimestamp, type Timestamp } from '@shared/dates';
import { BOOKS_FILE_NAME, bundledMigrations, openStore } from './database';
import { migrationsFromFiles, type Migration } from './migrations';
import { PRE_MIGRATION_DIR, preMigrationCopyName, pruneCopies } from './pre-migration-copy';

function time(text: string): Timestamp {
  const r = parseTimestamp(text);
  if (!r.ok) throw new Error('bad timestamp');
  return r.value;
}
const now = () => time('2026-11-22T06:30:43.292Z');

function real(): Migration[] {
  const r = bundledMigrations();
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}
function plus(files: Record<string, string>): Migration[] {
  const r = migrationsFromFiles(files);
  if (!r.ok) throw new Error(r.error.message);
  return [...real(), ...r.value];
}

// Invented migrations are numbered from 9001, so they never collide with a real one.
const sampleTable = plus({
  'm/9001-sample.sql': 'CREATE TABLE sample (id TEXT PRIMARY KEY, note TEXT NOT NULL) STRICT;',
});
const broken = [
  ...sampleTable,
  ...plus({
    'm/9002-broken.sql':
      "ALTER TABLE sample ADD COLUMN extra TEXT; INSERT INTO no_such_table VALUES ('x');",
  }).slice(-1),
];

function contents(path: string): unknown {
  const db = new Database(path, { readonly: true });
  const result = {
    tables: db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all(),
    rows: db.prepare('SELECT id, note FROM sample ORDER BY id').all(),
    version: db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get(),
  };
  db.close();
  return result;
}

let dir: string;
let books: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pre-migration-test-'));
  books = join(dir, BOOKS_FILE_NAME);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function booksWithData(): void {
  const store = openStore(books, sampleTable, now);
  if (!store.ok) throw new Error(store.error.message);
  const insert = store.value.db.prepare('INSERT INTO sample (id, note) VALUES (?, ?)');
  for (let i = 0; i < 300; i += 1)
    insert.run(`ent_${String(i).padStart(4, '0')}`, `Invented note ${String(i)}`);
  store.value.close();
}

describe('pre-migration copy', () => {
  it('copies the books before migrating, and a failing migration leaves the file unchanged', () => {
    booksWithData();
    const before = contents(books);

    const result = openStore(books, broken, now);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'migration-failed',
        message: expect.stringContaining('9002-broken') as unknown,
      },
    });

    expect(contents(books)).toEqual(before);
    const copy = join(dir, PRE_MIGRATION_DIR, 'books-9001-2026-11-22T06-30-43-292Z.db');
    expect(existsSync(copy)).toBe(true);
    expect(contents(copy)).toEqual(before);
  });

  it('makes no copy for a new, empty file', () => {
    const store = openStore(books, real(), now);
    if (store.ok) store.value.close();
    expect(existsSync(join(dir, PRE_MIGRATION_DIR))).toBe(false);
  });

  it('makes no copy when nothing is waiting', () => {
    booksWithData();
    const store = openStore(books, sampleTable, now);
    if (store.ok) store.value.close();
    expect(existsSync(join(dir, PRE_MIGRATION_DIR))).toBe(false);
  });

  it('keeps only the newest five copies', () => {
    const copies = join(dir, PRE_MIGRATION_DIR);
    mkdirSync(copies);
    const times = ['01', '02', '03', '04', '05', '06', '07'].map((d) =>
      time(`2026-11-${d}T00:00:00.000Z`),
    );
    for (const t of times) writeFileSync(join(copies, preMigrationCopyName(1, t)), '');
    writeFileSync(join(copies, 'notes.txt'), 'not a copy');
    pruneCopies(copies, 5);
    expect(readdirSync(copies).sort()).toEqual([
      'books-1-2026-11-03T00-00-00-000Z.db',
      'books-1-2026-11-04T00-00-00-000Z.db',
      'books-1-2026-11-05T00-00-00-000Z.db',
      'books-1-2026-11-06T00-00-00-000Z.db',
      'books-1-2026-11-07T00-00-00-000Z.db',
      'notes.txt',
    ]);
  });
});

describe('integrity check', () => {
  it('opens sound books', () => {
    booksWithData();
    const store = openStore(books, sampleTable, now);
    expect(store.ok).toBe(true);
    if (store.ok) store.value.close();
  });

  it('refuses books whose integrity check reports problems, even though they open', () => {
    const indexed = plus({
      'm/9001-sample.sql':
        'CREATE TABLE sample (id TEXT PRIMARY KEY, note TEXT NOT NULL) STRICT; CREATE INDEX sample_note ON sample (note);',
    });
    const store = openStore(books, indexed, now);
    if (!store.ok) throw new Error(store.error.message);
    const insert = store.value.db.prepare('INSERT INTO sample (id, note) VALUES (?, ?)');
    for (let i = 0; i < 300; i += 1)
      insert.run(`ent_${String(i).padStart(4, '0')}`, `Invented note ${String(i)}`);
    store.value.close();

    // Change four bytes of row data on one page after another, until SQLite itself reports a
    // problem (a row missing from an index) without refusing to read the file.
    const damaged = join(dir, 'damaged.db');
    let found = false;
    for (let page = 2; page < 12 && !found; page += 1) {
      for (const at of [1500, 2500, 3500]) {
        copyFileSync(books, damaged);
        const fd = openSync(damaged, 'r+');
        writeSync(fd, Buffer.from('ZZZZ'), 0, 4, 4096 * page + at);
        closeSync(fd);
        const probe = new Database(damaged);
        let messages: string[];
        try {
          messages = (probe.pragma('integrity_check') as { integrity_check: string }[]).map(
            (r) => r.integrity_check,
          );
        } catch {
          // This damage stops SQLite reading at all, which the next test covers.
          messages = [];
        }
        probe.close();
        if (messages.some((m) => m.includes('missing from index'))) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
    const result = openStore(damaged, indexed, now);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'integrity-failed',
        message: expect.stringContaining('missing from index') as unknown,
      },
    });
  });

  it('refuses damaged books, and does not open them', () => {
    booksWithData();
    // Overwrite the start of the third page (4096-byte pages), where SQLite keeps the
    // page's structure, so the damage is in the file's structure and not only in a row.
    const fd = openSync(books, 'r+');
    writeSync(fd, Buffer.alloc(64, 0x5a), 0, 64, 4096 * 2);
    closeSync(fd);
    const result = openStore(books, sampleTable, now);
    expect(result).toMatchObject({ ok: false, error: { code: 'integrity-failed' } });
  });
});
