import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bundledMigrations, openStore, type Store } from '@data/database';
import { getTrialBalance } from '@services/get-trial-balance';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { parseCalendarDate, parseTimestamp } from '@shared/dates';
import { listBackups, makeBackup, prepareRestore, pruneBackups } from './backups';

const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
const now = parseTimestamp('2026-11-23T01:00:00.000Z');
if (!today.ok || !now.ok) throw new Error('date');

let work: string;
let folder: string;
let store: Store;
const key = randomBytes(32);

const openBooks = (path: string) => {
  const migrations = bundledMigrations();
  if (!migrations.ok) throw new Error('migrations');
  return openStore(path, migrations.value, () => now.value);
};

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'backup-work-'));
  folder = mkdtempSync(join(tmpdir(), 'backup-folder-'));
  const opened = openBooks(join(work, 'books.db'));
  if (!opened.ok) throw new Error('open');
  store = opened.value;
  buildSampleBooks({ db: store.db }, today.value);
});
afterEach(() => {
  store.close();
  rmSync(work, { recursive: true, force: true });
  rmSync(folder, { recursive: true, force: true });
});

const backup = (stamp = '2026-11-23 0914') =>
  makeBackup({
    store,
    mode: 'sample',
    key,
    folder,
    workDir: work,
    createdAt: now.value,
    localStamp: stamp,
    appVersion: '1.0.0',
  });

const trialBalance = (s: Store) => {
  const tb = getTrialBalance({ db: s.db }, { from: null, to: null });
  if (!tb.ok) throw new Error('tb');
  return tb.value;
};

describe('backing up and restoring (specs 136, 138)', () => {
  it('a backup restores to identical books', async () => {
    const made = await backup();
    if (!made.ok) throw new Error(made.error);
    expect(made.value.fileName).toBe('Accounting Books sample 2026-11-23 0914.abbackup');
    expect(readdirSync(work).filter((n) => n.startsWith('backup-in-progress'))).toEqual([]);
    const listed = listBackups(folder);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.header).toMatchObject({ mode: 'sample', entries: made.value.header.entries });

    const prepared = prepareRestore({
      folder,
      name: made.value.fileName,
      key,
      mode: 'sample',
      workDir: work,
      openBooks,
    });
    if (!prepared.ok) throw new Error(prepared.error);
    const restored = openBooks(prepared.value.path);
    if (!restored.ok) throw new Error('open');
    expect(trialBalance(restored.value)).toEqual(trialBalance(store));
    expect(prepared.value.entries).toBe(made.value.header.entries);
    restored.value.close();
  });

  it('is unreadable without the key, and a tampered file is refused with nothing written', async () => {
    const made = await backup();
    if (!made.ok) throw new Error(made.error);
    const name = made.value.fileName;
    expect(readFileSync(join(folder, name)).includes(Buffer.from('Harbour Lane'))).toBe(false);
    expect(
      prepareRestore({
        folder,
        name,
        key: randomBytes(32),
        mode: 'sample',
        workDir: work,
        openBooks,
      }),
    ).toEqual({ ok: false, error: 'wrong-key' });
    const file = readFileSync(join(folder, name));
    file[file.length - 10] = (file[file.length - 10] ?? 0) ^ 0xff;
    writeFileSync(join(folder, name), file);
    const before = readdirSync(work).sort();
    expect(prepareRestore({ folder, name, key, mode: 'sample', workDir: work, openBooks }).ok).toBe(
      false,
    );
    expect(readdirSync(work).sort()).toEqual(before);
  });

  it('never restores sample books over his own, nor reads a file it did not write', async () => {
    const made = await backup();
    if (!made.ok) throw new Error(made.error);
    expect(
      prepareRestore({
        folder,
        name: made.value.fileName,
        key,
        mode: 'real',
        workDir: work,
        openBooks,
      }),
    ).toEqual({ ok: false, error: 'other-mode' });
    expect(
      prepareRestore({
        folder,
        name: '../books.db',
        key,
        mode: 'sample',
        workDir: work,
        openBooks,
      }),
    ).toEqual({ ok: false, error: 'not-a-backup' });
  });

  it('keeps one backup a day, and never overwrites one made in the same minute', async () => {
    await backup('2026-11-23 0914');
    const second = await backup('2026-11-23 0914');
    expect(second.ok && second.value.fileName).toBe(
      'Accounting Books sample 2026-11-23 0914 2.abbackup',
    );
    expect(pruneBackups(folder, today.value, 'sample')).toBe(1);
    expect(listBackups(folder)).toHaveLength(1);
  });

  it('says so when the folder is gone', async () => {
    rmSync(folder, { recursive: true, force: true });
    expect(await backup()).toEqual({ ok: false, error: 'no-folder' });
  });
});
