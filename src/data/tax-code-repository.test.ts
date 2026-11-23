import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { parseTimestamp, type Timestamp } from '@shared/dates';
import { bundledMigrations } from './database';
import { runMigrations, type Migration } from './migrations';
import { getTaxCodeById, getTaxCodeByShortCode, listTaxCodes } from './tax-code-repository';
import { createTestDatabase } from './test-database';

const now = (): Timestamp => {
  const t = parseTimestamp('2026-11-23T00:00:00.000Z');
  if (!t.ok) throw new Error('bad time');
  return t.value;
};

function realMigrations(): Migration[] {
  const r = bundledMigrations();
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

describe('the seeded tax codes', () => {
  const store = createTestDatabase();

  it('has GST at 10%, and FRE, INP and N-T at no rate', () => {
    expect(
      listTaxCodes(store.db).map((t) => [t.shortCode, t.treatment, t.rateBp, t.active]),
    ).toEqual([
      ['FRE', 'gst-free', 0, true],
      ['GST', 'taxable', 1000, true],
      ['INP', 'input-taxed', 0, true],
      ['N-T', 'outside-gst', 0, true],
    ]);
  });

  it('is found by id and by short code', () => {
    const gst = getTaxCodeByShortCode(store.db, 'GST');
    expect(gst).toMatchObject({ id: 'tax_gst', treatment: 'taxable', rateBp: 1000 });
    expect(getTaxCodeById(store.db, 'tax_nt')?.shortCode).toBe('N-T');
    expect(getTaxCodeById(store.db, 'tax_nope')).toBeNull();
  });

  it('refuses a rate on anything but a taxable code, a rate over 100%, and a repeated short code', () => {
    const insert = (id: string, short: string, treatment: string, rate: number) =>
      store.db
        .prepare(
          'INSERT INTO tax_code (id, short_code, name, treatment, rate_bp) VALUES (?, ?, ?, ?, ?)',
        )
        .run(id, short, 'x', treatment, rate);
    expect(() => insert('tax_a', 'A', 'gst-free', 500)).toThrow();
    expect(() => insert('tax_b', 'B', 'taxable', 10001)).toThrow();
    expect(() => insert('tax_c', 'GST', 'taxable', 1000)).toThrow(/UNIQUE/);
    expect(() => insert('tax_d', 'D', 'mystery', 0)).toThrow();
    expect(() => insert('tax_e', 'E', 'taxable', 500)).not.toThrow();
  });

  it('is now enforced on accounts: a default tax code must exist', () => {
    const addAccount = (code: string, tax: string | null) =>
      store.db
        .prepare(
          "INSERT INTO account (id, code, name, type, default_tax_code_id, created_at, updated_at) VALUES (?, ?, 'x', 'asset', ?, 't', 't')",
        )
        .run(`acc_${code}`, code, tax);
    expect(() => addAccount('9001', 'tax_nope')).toThrow(/FOREIGN KEY/);
    expect(() => addAccount('9002', 'tax_gst')).not.toThrow();
    expect(() => addAccount('9003', null)).not.toThrow();
  });
});

describe('the migration that links accounts to tax codes', () => {
  it('keeps every account and sub-account, and every rule on the table', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    const all = realMigrations();
    runMigrations(
      db,
      all.filter((m) => m.version < 5),
      now,
    );
    const insert = db.prepare(
      "INSERT INTO account (id, code, name, type, parent_id, default_tax_code_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, 'c', 'u')",
    );
    insert.run('acc_parent', '1000', 'Bank', 'asset', null, 1);
    insert.run('acc_child', '1001', 'Wages account', 'asset', 'acc_parent', 0);
    const before = db.prepare('SELECT * FROM account ORDER BY code').all();

    const result = runMigrations(db, all, now);
    expect(result.ok ? 'ok' : result.error.message).toBe('ok');
    expect(db.prepare('SELECT * FROM account ORDER BY code').all()).toEqual(before);
    expect(() => insert.run('acc_dup', '1000', 'Again', 'asset', null, 1)).toThrow(/UNIQUE/);
    expect(() => insert.run('acc_orphan', '1002', 'Orphan', 'asset', 'acc_missing', 1)).toThrow(
      /FOREIGN KEY/,
    );
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
  });
});
