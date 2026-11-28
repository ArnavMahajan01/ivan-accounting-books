import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAppMeta } from '@data/app-meta-repository';
import { bundledMigrations, openStore, type OpenError, type Store } from '@data/database';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';
import { createLogger, type LogRecord } from '@shared/logger';
import type { Result } from '@shared/result';
import {
  createBooksSession,
  SAMPLE_FOLDER,
  type BooksSession,
  type BooksSessionDeps,
} from './books-session';

const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
const now = parseTimestamp('2026-11-23T01:00:00.000Z');
if (!today.ok || !now.ok) throw new Error('bad test date');
const nowStamp = now.value;
const clock = fixedClock(today.value, nowStamp);

let dir: string;
let records: LogRecord[];
let sessions: BooksSession[];
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'books-session-'));
  records = [];
  sessions = [];
});
afterEach(() => {
  for (const session of sessions) session.close();
  rmSync(dir, { recursive: true, force: true });
});

function openBooks(path: string): Result<Store, OpenError> {
  const migrations = bundledMigrations();
  if (!migrations.ok) throw new Error('migrations');
  return openStore(path, migrations.value, () => nowStamp);
}

function session(over: Partial<BooksSessionDeps> = {}): BooksSession {
  const created = createBooksSession({
    dir,
    openBooks,
    clock,
    log: createLogger('test', (record) => records.push(record)),
    sampleSwitch: true,
    ...over,
  });
  sessions.push(created);
  return created;
}

/** Reads the real books file through its own, separate connection, not the session's. */
function readReal(sql: string): Record<string, unknown> {
  const real = openBooks(join(dir, 'books.db'));
  if (!real.ok) throw new Error('the real books did not open');
  try {
    return real.value.db.prepare(sql).get() as Record<string, unknown>;
  } finally {
    real.value.close();
  }
}

describe('a new session', () => {
  it('opens the real books, and offers the first-launch choice when they are empty', () => {
    const books = session();
    expect(books.mode()).toBe('real');
    expect(books.store().ok).toBe(true);
    expect(existsSync(join(dir, 'books.db'))).toBe(true);
    expect(existsSync(join(dir, SAMPLE_FOLDER))).toBe(false);
    expect(books.state()).toEqual({
      mode: 'real',
      businessName: null,
      sampleSwitch: true,
      needsStartChoice: true,
    });
  });

  it('remembers "Start my own books", so the choice is not offered again, even after a restart', () => {
    const first = session();
    expect(first.startOwnBooks()).toEqual({ ok: true, value: undefined });
    expect(first.state().needsStartChoice).toBe(false);
    first.close();
    expect(session().state().needsStartChoice).toBe(false);
  });

  it('never offers the choice in a build with the sample switch off', () => {
    expect(session({ sampleSwitch: false }).state()).toMatchObject({
      sampleSwitch: false,
      needsStartChoice: false,
    });
  });
});

describe('loading the sample data', () => {
  it('builds the sample books in their own folder, switches to them, and shows the business name', () => {
    const books = session();
    expect(books.loadSample()).toEqual({ ok: true, value: undefined });
    expect(books.mode()).toBe('sample');
    expect(books.state()).toEqual({
      mode: 'sample',
      businessName: 'Harbour Lane Joinery Pty Ltd',
      sampleSwitch: true,
      needsStartChoice: false,
    });
    expect(readdirSync(join(dir, SAMPLE_FOLDER))).toContain('books.db');
    expect(readdirSync(join(dir, SAMPLE_FOLDER))).not.toContain('building.db');
    const open = books.store();
    expect(
      open.ok &&
        (open.value.db.prepare('SELECT COUNT(*) AS n FROM journal_entry').get() as { n: number }).n,
    ).toBeGreaterThan(50);
    expect(records.map((r) => r.event)).toContain('sample.loaded');
  });

  it('leaves the real books exactly as they were: no sample rows, and what was in them is still there', () => {
    const books = session();
    if (!books.store().ok) throw new Error('not open');
    setAppMeta((books.store() as { ok: true; value: Store }).value.db, 'marker', 'real data');
    books.loadSample();
    const realEntries = readReal('SELECT COUNT(*) AS n FROM journal_entry');
    const realBusiness = readReal('SELECT COUNT(*) AS n FROM business');
    const marker = readReal("SELECT value FROM app_meta WHERE key = 'marker'");
    expect([realEntries.n, realBusiness.n, marker.value]).toEqual([0, 0, 'real data']);
  });

  it('refuses to load twice, and in a build with the sample switch off', () => {
    const books = session();
    books.loadSample();
    expect(books.loadSample()).toEqual({ ok: false, error: 'already-loaded' });
    const off = session({ sampleSwitch: false, dir: mkdtempSync(join(tmpdir(), 'books-off-')) });
    expect(off.loadSample()).toEqual({ ok: false, error: 'switch-off' });
    expect(off.clearSample()).toEqual({ ok: false, error: 'switch-off' });
  });

  it('leaves no trace if the build fails, and the real books keep working', () => {
    const books = session({
      build: () => {
        throw new Error('forced failure with some private text');
      },
    });
    expect(books.loadSample()).toEqual({ ok: false, error: 'failed' });
    expect(books.mode()).toBe('real');
    expect(books.store().ok).toBe(true);
    expect(existsSync(join(dir, SAMPLE_FOLDER))).toBe(false);
    expect(JSON.stringify(records)).not.toContain('private text');
    expect(records.map((r) => r.event)).toContain('sample.load-failed');
    expect(books.startOwnBooks().ok).toBe(true);
  });
});

describe('clearing the sample data', () => {
  it('deletes only the sample folder, and goes back to the real books', () => {
    const books = session();
    books.loadSample();
    expect(books.clearSample()).toEqual({ ok: true, value: undefined });
    expect(books.mode()).toBe('real');
    expect(existsSync(join(dir, SAMPLE_FOLDER))).toBe(false);
    expect(existsSync(join(dir, 'books.db'))).toBe(true);
    expect(books.state()).toMatchObject({
      mode: 'real',
      businessName: null,
      needsStartChoice: true,
    });
    const store = books.store();
    expect(
      store.ok &&
        (store.value.db.prepare('SELECT COUNT(*) AS n FROM journal_entry').get() as { n: number })
          .n,
    ).toBe(0);
    expect(records.map((r) => r.event)).toContain('sample.cleared');
  });

  it('never touches anything else in the data folder: the real books, logs and other files', () => {
    mkdirSync(join(dir, 'logs'));
    writeFileSync(join(dir, 'logs', 'app.log'), 'a line\n');
    writeFileSync(join(dir, 'window-state.json'), '{}');
    const books = session();
    books.loadSample();
    books.clearSample();
    expect(readdirSync(dir).sort()).toEqual(
      ['books.db', 'books.db-shm', 'books.db-wal', 'logs', 'window-state.json']
        .filter((name) => existsSync(join(dir, name)))
        .sort(),
    );
    expect(existsSync(join(dir, 'logs', 'app.log'))).toBe(true);
    expect(existsSync(join(dir, 'window-state.json'))).toBe(true);
    expect(existsSync(join(dir, 'books.db'))).toBe(true);
  });

  it('says so when there is nothing to clear', () => {
    expect(session().clearSample()).toEqual({ ok: false, error: 'not-loaded' });
  });

  it('can load again after clearing, and gives the same books', () => {
    const books = session();
    books.loadSample();
    const count = () => {
      const store = books.store();
      return store.ok
        ? (store.value.db.prepare('SELECT COUNT(*) AS n FROM journal_entry').get() as { n: number })
            .n
        : -1;
    };
    const first = count();
    books.clearSample();
    books.loadSample();
    expect(count()).toBe(first);
  });
});

describe('starting again with sample data already on disk', () => {
  it('opens the sample books, as they were left', () => {
    const first = session();
    first.loadSample();
    first.close();
    const second = session();
    expect(second.mode()).toBe('sample');
    expect(second.state().businessName).toBe('Harbour Lane Joinery Pty Ltd');
  });

  it('ignores the sample books in a build with the sample switch off, and never touches them', () => {
    const first = session();
    first.loadSample();
    first.close();
    const off = session({ sampleSwitch: false });
    expect(off.mode()).toBe('real');
    expect(existsSync(join(dir, SAMPLE_FOLDER, 'books.db'))).toBe(true);
  });

  it('throws away damaged sample books and opens the real ones', () => {
    mkdirSync(join(dir, SAMPLE_FOLDER));
    writeFileSync(join(dir, SAMPLE_FOLDER, 'books.db'), 'this is not a database file at all');
    const books = session();
    expect(books.mode()).toBe('real');
    expect(books.store().ok).toBe(true);
    expect(existsSync(join(dir, SAMPLE_FOLDER))).toBe(false);
    expect(records.map((r) => r.event)).toContain('sample.discarded');
  });
});

describe('the first-launch choice', () => {
  it('cannot be made while the sample books are open', () => {
    const books = session();
    books.loadSample();
    expect(books.startOwnBooks()).toEqual({ ok: false, error: 'wrong-mode' });
  });
});

describe('restoring a backup (spec 138)', () => {
  it('puts the checked file in place, keeping the books it replaced beside it', () => {
    const s = session();
    const current = s.store();
    if (!current.ok) throw new Error('not open');
    setAppMeta(current.value.db, 'marker', 'before');
    const other = openBooks(join(dir, 'candidate.db'));
    if (!other.ok) throw new Error('candidate');
    setAppMeta(other.value.db, 'marker', 'restored');
    other.value.close();
    expect(s.replaceBooks(join(dir, 'candidate.db')).ok).toBe(true);
    const after = s.store();
    if (!after.ok) throw new Error('not open');
    expect(
      (
        after.value.db.prepare("SELECT value FROM app_meta WHERE key = 'marker'").get() as {
          value: string;
        }
      ).value,
    ).toBe('restored');
    expect(existsSync(join(dir, 'books-before-restore.db'))).toBe(true);
    expect(existsSync(join(dir, 'candidate.db'))).toBe(false);
  });

  it('puts the old books back when the new file will not open', () => {
    const s = session();
    const current = s.store();
    if (!current.ok) throw new Error('not open');
    setAppMeta(current.value.db, 'marker', 'before');
    writeFileSync(join(dir, 'broken.db'), 'not a database at all');
    expect(s.replaceBooks(join(dir, 'broken.db'))).toEqual({ ok: false, error: 'failed' });
    const after = s.store();
    if (!after.ok) throw new Error('not open');
    expect(
      (
        after.value.db.prepare("SELECT value FROM app_meta WHERE key = 'marker'").get() as {
          value: string;
        }
      ).value,
    ).toBe('before');
  });
});
