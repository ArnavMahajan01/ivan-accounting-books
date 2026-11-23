import { describe, expect, it } from 'vitest';
import { findSqlWrites } from './sql-writes.ts';

const tables = ['journal_entry', 'journal_line'];
const verbs = (text: string) => findSqlWrites(text, tables).map((w) => `${w.verb} ${w.table}`);

describe('findSqlWrites', () => {
  it.each([
    ['INSERT INTO journal_line (id) VALUES (?)', 'insert journal_line'],
    ['insert into journal_entry (id) values (?)', 'insert journal_entry'],
    ['INSERT OR REPLACE INTO journal_line (id) VALUES (?)', 'insert journal_line'],
    ['INSERT\n  INTO\n  journal_line', 'insert journal_line'],
    ['REPLACE INTO journal_entry', 'replace journal_entry'],
    ['UPDATE journal_line SET amount_cents = 0', 'update journal_line'],
    ['UPDATE OR IGNORE journal_line SET x = 1', 'update journal_line'],
    ['DELETE FROM journal_entry WHERE id = ?', 'delete journal_entry'],
    ['ALTER TABLE journal_line ADD COLUMN x TEXT', 'alter journal_line'],
    ['DROP TABLE IF EXISTS journal_line', 'drop journal_line'],
    ['INSERT INTO "journal_line" (id) VALUES (?)', 'insert journal_line'],
  ])('finds %j', (text, expected) => {
    expect(verbs(text)).toContain(expected);
  });

  it.each([
    'SELECT * FROM journal_line WHERE entry_id = ?',
    'INSERT INTO audit_log (id) VALUES (?)',
    'INSERT INTO journal_lines_backup (id) VALUES (?)',
    'const journal_line = 1; // an update to journal_line is described here',
    'UPDATE account SET name = ?',
  ])('leaves %j alone', (text) => {
    expect(verbs(text)).toEqual([]);
  });
});
