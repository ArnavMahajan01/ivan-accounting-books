import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAppMeta } from '@data/app-meta-repository';
import { bundledMigrations, openStore } from '@data/database';
import { countJournalEntries } from '@data/journal-queries';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { fixedClock, parseCalendarDate, parseTimestamp, type Timestamp } from '@shared/dates';
import { createLogger } from '@shared/logger';
import { createBackupManager, type KeyCipher } from './backup-manager';
import { createBooksSession } from './books-session';

const parsedDay = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
const p1 = parseTimestamp('2026-11-23T01:00:00.000Z');
const p2 = parseTimestamp('2026-11-24T02:00:00.000Z');
if (!parsedDay.ok || !p1.ok || !p2.ok) throw new Error('date');
const today = parsedDay.value;
const t1 = p1.value;
const t2 = p2.value;

/** The Keychain, in memory: base64 of the text, so nothing is plain in the file either way. */
const keychain = (available = true): KeyCipher => ({
  isAvailable: () => Promise.resolve(available),
  encrypt: (text) => Promise.resolve(Buffer.from(Buffer.from(text).toString('base64'))),
  decrypt: (data) => Promise.resolve(Buffer.from(data.toString(), 'base64').toString()),
});

let dir: string;
let folder: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'backup-manager-'));
  folder = mkdtempSync(join(tmpdir(), 'backup-to-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(folder, { recursive: true, force: true });
});

function setup(now: Timestamp = t1, cipher = keychain(), build = true) {
  const migrations = bundledMigrations();
  if (!migrations.ok) throw new Error('migrations');
  const openBooks = (path: string) => openStore(path, migrations.value, () => now);
  const clock = fixedClock(today, now);
  const log = createLogger('test', () => undefined);
  const books = createBooksSession({ dir, openBooks, clock, log, sampleSwitch: true });
  const store = books.store();
  if (!store.ok) throw new Error('books');
  if (build) buildSampleBooks({ db: store.value.db }, today);
  const manager = createBackupManager({
    dataDir: dir,
    books,
    cipher,
    clock,
    appVersion: '1.0.0',
    log,
    localStamp: () => '2026-11-23 0914',
    chooseFolder: () => Promise.resolve(folder),
    openBooks,
  });
  return { books, manager };
}

describe('backups in the app (specs 136 to 138)', () => {
  it('turns on with a folder, gives a recovery key, backs up and remembers when', async () => {
    const { books, manager } = setup();
    expect(await manager.turnOn()).toEqual({ kind: 'refused', reason: 'no-folder' });
    expect(await manager.chooseFolder()).toEqual({ folderName: folder.split('/').at(-1) });
    const on = await manager.turnOn();
    expect(on.kind === 'on' && on.recoveryKey).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
    expect(await manager.backupNow()).toMatchObject({ kind: 'done' });
    expect(await manager.status()).toMatchObject({
      daily: true,
      keyReady: true,
      lastBackupAt: t1,
    });
    expect(manager.list()).toHaveLength(1);
    books.close();
  });

  it('restores a backup over changed books, and the change is gone', async () => {
    const { books, manager } = setup();
    await manager.chooseFolder();
    await manager.turnOn();
    const made = await manager.backupNow();
    if (made.kind !== 'done') throw new Error('no backup');
    const store = books.store();
    if (!store.ok) throw new Error('books');
    const entries = countJournalEntries(store.value.db);
    setAppMeta(store.value.db, 'changed-after-backup', 'yes');
    expect(await manager.restore(made.fileName, null)).toEqual({ kind: 'restored', entries });
    expect((await manager.status()).lastBackupAt).toBe(t1);
    const after = books.store();
    if (!after.ok) throw new Error('books');
    expect(
      after.value.db.prepare("SELECT value FROM app_meta WHERE key = 'changed-after-backup'").get(),
    ).toBeUndefined();
    books.close();
  });

  it('asks for the recovery key when the Keychain key is not the one it was made with', async () => {
    const { books, manager } = setup();
    await manager.chooseFolder();
    const on = await manager.turnOn();
    if (on.kind !== 'on') throw new Error('not on');
    const made = await manager.backupNow();
    if (made.kind !== 'done') throw new Error('no backup');
    rmSync(join(dir, 'backup-key.bin'));
    expect(await manager.restore(made.fileName, null)).toEqual({
      kind: 'refused',
      reason: 'needs-recovery-key',
    });
    expect(await manager.restore(made.fileName, 'WRONG')).toEqual({
      kind: 'refused',
      reason: 'bad-recovery-key',
    });
    expect(await manager.restore(made.fileName, on.recoveryKey)).toMatchObject({
      kind: 'restored',
    });
    books.close();
  });

  it('backs up by itself only when the last backup is a day old', async () => {
    const first = setup(t1);
    await first.manager.chooseFolder();
    await first.manager.turnOn();
    await first.manager.runIfDue();
    await first.manager.runIfDue();
    expect(readdirSync(folder)).toHaveLength(1);
    first.books.close();
    const next = setup(t2, keychain(), false);
    await next.manager.runIfDue();
    expect(readdirSync(folder).length).toBeGreaterThanOrEqual(1);
    expect((await next.manager.status()).lastBackupAt).toBe(t2);
    next.books.close();
  });

  it('says so without the Keychain, and writes nothing', async () => {
    const { books, manager } = setup(t1, keychain(false));
    await manager.chooseFolder();
    expect(await manager.turnOn()).toEqual({ kind: 'refused', reason: 'no-keychain' });
    expect(await manager.backupNow()).toEqual({ kind: 'refused', reason: 'no-keychain' });
    expect(readdirSync(folder)).toEqual([]);
    books.close();
  });
});
