import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './test-database';

// Raw SQL on purpose: this tests the tables' own rules, below the posting service.
let db: ReturnType<typeof createTestDatabase>['db'];
beforeEach(() => {
  db = createTestDatabase().db;
  db.exec(`
    INSERT INTO account (id, code, name, type, created_at, updated_at)
      VALUES ('acc_bank', '1000', 'Bank', 'asset', 't', 't'), ('acc_sales', '4000', 'Sales', 'income', 't', 't');
    INSERT INTO journal_entry (id, entry_date, memo, source_kind, created_at, updated_at)
      VALUES ('ent_1', '2026-07-01', 'A sale', 'manual', 't', 't');
  `);
});

const addLine = (over: Record<string, unknown> = {}) => {
  const row = {
    id: 'lin_1',
    entry: 'ent_1',
    position: 0,
    account: 'acc_bank',
    amount: 110000,
    tax: null,
    gst: 0,
    ...over,
  };
  return db
    .prepare(
      'INSERT INTO journal_line (id, entry_id, position, account_id, amount_cents, tax_code_id, gst_cents) VALUES (@id, @entry, @position, @account, @amount, @tax, @gst)',
    )
    .run(row);
};

describe('the journal tables', () => {
  it('exist, with the indexes the balances need', () => {
    const names = (type: string) =>
      (
        db.prepare('SELECT name FROM sqlite_master WHERE type = ?').all(type) as { name: string }[]
      ).map((r) => r.name);
    expect(names('table')).toEqual(
      expect.arrayContaining(['journal_entry', 'journal_line', 'audit_log']),
    );
    expect(names('index')).toEqual(
      expect.arrayContaining(['journal_entry_date', 'journal_line_account']),
    );
  });

  it('take a line with a tax code and its GST', () => {
    expect(() =>
      addLine({ account: 'acc_sales', amount: -100000, tax: 'tax_gst', gst: -10000 }),
    ).not.toThrow();
  });

  it('refuse a line of zero, an unknown account, entry or tax code', () => {
    expect(() => addLine({ amount: 0 })).toThrow(/CHECK/);
    expect(() => addLine({ account: 'acc_nope' })).toThrow(/FOREIGN KEY/);
    expect(() => addLine({ entry: 'ent_nope' })).toThrow(/FOREIGN KEY/);
    expect(() => addLine({ tax: 'tax_nope' })).toThrow(/FOREIGN KEY/);
  });

  it('refuse GST with the opposite sign to the amount', () => {
    expect(() => addLine({ amount: -100000, gst: 10000 })).toThrow(/CHECK/);
    expect(() => addLine({ amount: 100000, gst: -10000 })).toThrow(/CHECK/);
  });

  it('refuse the same position twice in one entry', () => {
    addLine();
    expect(() => addLine({ id: 'lin_2' })).toThrow(/UNIQUE/);
    expect(() => addLine({ id: 'lin_3', position: 1 })).not.toThrow();
  });

  it('refuse a bad date and an unknown source', () => {
    const entry = (date: string, source: string) =>
      db
        .prepare(
          "INSERT INTO journal_entry (id, entry_date, source_kind, created_at, updated_at) VALUES ('ent_x', ?, ?, 't', 't')",
        )
        .run(date, source);
    expect(() => entry('21/11/2026', 'manual')).toThrow(/CHECK/);
    expect(() => entry('2026-11-21', 'guess')).toThrow(/CHECK/);
    expect(() => entry('2026-11-21', 'bank-line')).not.toThrow();
  });
});
