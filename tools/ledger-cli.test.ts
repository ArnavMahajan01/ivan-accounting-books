// Spec 044: the ledger tool, run in-process against throwaway books files.

import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { bundledMigrations, openStore } from '@data/database';
import type { EntryLineInput } from '@domain/journal';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';
import { seededRandom } from '@shared/ids';
import { asCents } from '@shared/money';
import { postEntry } from '@services/post-journal';
import { runCli, USAGE } from './ledger-cli.ts';

let dir: string;
let file: string;
let appData: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ledger-cli-test-'));
  file = join(dir, 'books.db');
  appData = join(dir, 'Application Support');
  mkdirSync(appData);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = runCli(
    args,
    { out: (t) => out.push(t), err: (t) => err.push(t) },
    { appDataDir: appData },
  );
  return { code, out: out.join('\n'), err: err.join('\n') };
}

/** Posts invented entries into the books file the tool made, through the posting service. */
function postEntries(entries: { date: string; code: string; amount: number }[]): void {
  const migrations = bundledMigrations();
  if (!migrations.ok) throw new Error('migrations');
  const time = parseTimestamp('2026-11-23T01:00:00.000Z');
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!time.ok || !today.ok) throw new Error('time');
  const store = openStore(file, migrations.value, () => time.value);
  if (!store.ok) throw new Error(store.error.message);
  const ctx = {
    db: store.value.db,
    clock: fixedClock(today.value, time.value),
    random: seededRandom(5),
  };
  const line = (code: string, amount: number): EntryLineInput => {
    const account = getAccountByCode(ctx.db, code);
    if (account === null) throw new Error(code);
    return {
      accountId: account.id,
      amount: asCents(amount),
      taxCodeId: null,
      gst: asCents(0),
      payeeId: null,
      memo: '',
    };
  };
  for (const e of entries) {
    const date = parseCalendarDate(e.date, 'YYYY-MM-DD');
    if (!date.ok) throw new Error(e.date);
    const result = postEntry(ctx, {
      date: date.value,
      memo: '',
      sourceKind: 'manual',
      sourceId: null,
      lines: [line(e.code, e.amount), line('4000', -e.amount)],
    });
    if (!result.ok) throw new Error('not posted');
  }
  store.value.close();
}

function countRows(...tables: string[]): number[] {
  const migrations = bundledMigrations();
  const time = parseTimestamp('2026-11-23T01:00:00.000Z');
  if (!migrations.ok || !time.ok) throw new Error('setup');
  const store = openStore(file, migrations.value, () => time.value);
  if (!store.ok) throw new Error(store.error.message);
  const counts = tables.map(
    (t) => (store.value.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n,
  );
  store.value.close();
  return counts;
}

describe('using it wrongly', () => {
  it('prints usage and fails with no --file, so it cannot reach the real books by default', () => {
    for (const args of [['trial-balance'], ['init'], ['check']]) {
      const result = run(...args);
      expect(result.code).toBe(2);
      expect(result.err).toContain('--file is required.');
      expect(result.err).toContain(USAGE);
    }
    expect(existsSync(file)).toBe(false);
  });

  it('prints usage for no command, an unknown command, a flag with no value and a stray word', () => {
    expect(run().code).toBe(2);
    expect(run('wipe', '--file', file).err).toContain('Unknown command "wipe"');
    expect(run('check', '--file').err).toContain('--file needs a value');
    expect(run('check', 'extra', '--file', file).err).toContain('Unexpected "extra"');
    expect(existsSync(file)).toBe(false);
  });

  it("refuses a file inside the app's data folder, and creates nothing there", () => {
    const real = join(appData, 'Accounting Books', 'books.db');
    mkdirSync(join(appData, 'Accounting Books'));
    const result = run('init', '--file', real);
    expect(result.code).toBe(2);
    expect(result.err).toContain("inside the app's data folder");
    expect(existsSync(real)).toBe(false);
    expect(run('init', '--file', join(appData, 'books.db')).code).toBe(2);
  });

  it('will not create books by mistake: check and trial-balance need an existing file', () => {
    expect(run('check', '--file', file)).toMatchObject({ code: 2 });
    expect(run('trial-balance', '--file', file).err).toContain('Make them with: init');
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a bad date, and a range that ends before it starts', () => {
    run('init', '--file', file);
    expect(run('trial-balance', '--file', file, '--from', '1/7/2026').err).toContain('2026-07-01');
    expect(
      run('trial-balance', '--file', file, '--from', '2026-09-01', '--to', '2026-08-01').err,
    ).toContain('before');
  });
});

describe('init', () => {
  it('makes books with the sample business and its chart, and refuses to run twice', () => {
    const first = run('init', '--file', file);
    expect(first.code).toBe(0);
    expect(first.out).toContain('Books ready');
    expect(existsSync(file)).toBe(true);
    const before = countRows('account', 'audit_log', 'business');
    expect(before).toEqual([40, 1, 1]);
    const second = run('init', '--file', file);
    expect(second).toMatchObject({ code: 1 });
    expect(second.err).toContain('already-set-up');
    expect(countRows('account', 'audit_log', 'business')).toEqual(before);
  });
});

describe('trial-balance and check on new books', () => {
  it('prints an empty, balanced trial balance, and the check passes', () => {
    run('init', '--file', file);
    const tb = run('trial-balance', '--file', file);
    expect(tb.code).toBe(0);
    expect(tb.out).toContain('No entries in this range.');
    expect(tb.out).toContain('$0.00');
    expect(tb.out).toContain('Balanced: yes');
    expect(run('check', '--file', file)).toMatchObject({
      code: 0,
      out: 'Books check: ok (0 entries, 0 lines).',
    });
  });
});

describe('trial-balance with entries', () => {
  it('prints each account with its debit and credit, and a range cuts by date', () => {
    run('init', '--file', file);
    postEntries([
      { date: '2026-07-10', code: '1000', amount: 110000 },
      { date: '2026-08-20', code: '1000', amount: 2500 },
    ]);
    const all = run('trial-balance', '--file', file);
    expect(all.code).toBe(0);
    expect(all.out).toMatch(/1000\s+Business cheque account\s+\$1,125\.00/);
    expect(all.out).toMatch(/4000\s+Sales\s+\$1,125\.00/);
    expect(all.out).toContain('Balanced: yes');

    const august = run(
      'trial-balance',
      '--file',
      file,
      '--from',
      '2026-08-01',
      '--to',
      '2026-08-31',
    );
    expect(august.out).toContain('2026-08-01 to 2026-08-31');
    expect(august.out).toMatch(/1000\s+Business cheque account\s+\$25\.00/);
    expect(august.out).not.toContain('$1,125.00');
    expect(run('check', '--file', file).out).toBe('Books check: ok (2 entries, 4 lines).');
  });

  it('says so, and fails, when the books do not balance', () => {
    run('init', '--file', file);
    postEntries([{ date: '2026-07-10', code: '1000', amount: 110000 }]);
    const migrations = bundledMigrations();
    if (!migrations.ok) throw new Error('migrations');
    const time = parseTimestamp('2026-11-23T01:00:00.000Z');
    if (!time.ok) throw new Error('time');
    const store = openStore(file, migrations.value, () => time.value);
    if (!store.ok) throw new Error('open');
    store.value.db
      .prepare('UPDATE journal_line SET amount_cents = amount_cents + 1 WHERE rowid = 1')
      .run();
    store.value.close();

    const tb = run('trial-balance', '--file', file);
    expect(tb.code).toBe(1);
    expect(tb.out).toContain('Balanced: NO');
    const check = run('check', '--file', file);
    expect(check.code).toBe(1);
    expect(check.err).toBe('Books check FAILED: out-of-balance.');
  });
});
