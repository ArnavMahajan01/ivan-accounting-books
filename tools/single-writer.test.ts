// Spec 041, invariant 3: only the posting service writes journal entries and lines. Two searches
// of the source keep it so:
//  1. SQL that inserts, updates, deletes or alters `journal_entry` or `journal_line` appears only
//     in src/data/journal-writes.ts (and in the migrations, which are .sql files and not searched).
//  2. Only src/services/post-journal.ts imports that file.
// The spec named post-journal.ts for the SQL. The SQL lives in `data` instead, because only `data`
// may talk to SQLite, so a guard on the importer is what keeps the posting service the sole writer.
// Test files are not searched: they write raw SQL to a throwaway database on purpose.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSqlWrites } from './sql-writes.ts';

const WRITER_FILE = 'src/data/journal-writes.ts';
const POSTING_SERVICE = 'src/services/post-journal.ts';
const IMPORTS_THE_WRITER =
  /from\s+['"](?:@data\/journal-writes|(?:\.{1,2}\/)+(?:[\w-]+\/)*journal-writes)(?:\.ts)?['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

export function singleWriterProblems(files: Readonly<Record<string, string>>): string[] {
  const problems: string[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (file !== WRITER_FILE) {
      for (const write of findSqlWrites(text, ['journal_entry', 'journal_line'])) {
        problems.push(`${file}: ${write.verb} ${write.table} (only ${WRITER_FILE} may)`);
      }
    }
    if (file !== POSTING_SERVICE && file !== WRITER_FILE && IMPORTS_THE_WRITER.test(text)) {
      problems.push(`${file}: imports journal-writes (only ${POSTING_SERVICE} may)`);
    }
  }
  return problems;
}

describe('the single writer of the books', () => {
  it('is the posting service: nothing else writes journal rows or imports the writer', () => {
    const files = Object.fromEntries(
      [...sourceFiles('src'), ...sourceFiles('tools')].map((f) => [
        relative('.', f),
        readFileSync(f, 'utf8'),
      ]),
    );
    expect(Object.keys(files)).toContain(WRITER_FILE);
    expect(singleWriterProblems(files)).toEqual([]);
  });

  it('finds a journal write anywhere else', () => {
    expect(
      singleWriterProblems({
        'src/services/import-statement.ts':
          "db.prepare('INSERT INTO journal_line (id) VALUES (?)')",
      }),
    ).toEqual([
      'src/services/import-statement.ts: insert journal_line (only src/data/journal-writes.ts may)',
    ]);
    expect(
      singleWriterProblems({ 'src/data/other.ts': 'DELETE FROM journal_entry WHERE id = ?' }),
    ).toHaveLength(1);
    expect(
      singleWriterProblems({ 'tools/ledger-cli.ts': 'UPDATE journal_line SET amount_cents = 0' }),
    ).toHaveLength(1);
  });

  it('finds any other file that imports the writer, by either kind of path', () => {
    for (const source of [
      "import { insertJournalLine } from '@data/journal-writes';",
      "import { insertJournalLine } from './journal-writes';",
      "import { insertJournalLine } from '../data/journal-writes.ts';",
    ]) {
      expect(singleWriterProblems({ 'src/services/sneaky.ts': source })).toEqual([
        'src/services/sneaky.ts: imports journal-writes (only src/services/post-journal.ts may)',
      ]);
    }
  });

  it('allows the posting service and the writer itself', () => {
    expect(
      singleWriterProblems({
        'src/services/post-journal.ts': "import { x } from '@data/journal-writes';",
        'src/data/journal-writes.ts': 'INSERT INTO journal_line (id) VALUES (?)',
      }),
    ).toEqual([]);
  });

  it('still allows reads of the journal tables anywhere', () => {
    expect(
      singleWriterProblems({
        'src/data/journal-queries.ts': 'SELECT * FROM journal_line WHERE entry_id = ?',
        'src/services/anything.ts': "import { getJournalEntry } from '@data/journal-queries';",
      }),
    ).toEqual([]);
  });
});
