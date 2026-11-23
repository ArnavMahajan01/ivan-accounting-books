// Spec 037: the audit log only ever grows. The one insert is in src/data/audit-repository.ts, and
// nothing in the source updates, deletes, replaces, alters or drops it. A migration may create it.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSqlWrites } from './sql-writes.ts';

const INSERT_ALLOWED_IN = 'src/data/audit-repository.ts';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    // Tests write raw SQL to corrupt a throwaway database on purpose.
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

export function auditProblems(files: Readonly<Record<string, string>>): string[] {
  return Object.entries(files).flatMap(([file, text]) =>
    findSqlWrites(text, ['audit_log'])
      .filter((w) => w.verb !== 'insert' || file !== INSERT_ALLOWED_IN)
      .map((w) => `${file}: ${w.verb} audit_log`),
  );
}

describe('the audit log', () => {
  it('is only ever added to, and only by the audit repository', () => {
    const files = Object.fromEntries(
      sourceFiles('src').map((f) => [relative('.', f), readFileSync(f, 'utf8')]),
    );
    expect(auditProblems(files)).toEqual([]);
  });

  it('is caught if code updates, deletes or inserts into it from anywhere else', () => {
    expect(auditProblems({ 'src/services/x.ts': "db.run('DELETE FROM audit_log')" })).toEqual([
      'src/services/x.ts: delete audit_log',
    ]);
    expect(auditProblems({ 'src/services/x.ts': 'UPDATE audit_log SET kind = ?' })).toEqual([
      'src/services/x.ts: update audit_log',
    ]);
    expect(auditProblems({ 'src/services/x.ts': 'INSERT INTO audit_log (id) VALUES (?)' })).toEqual(
      ['src/services/x.ts: insert audit_log'],
    );
    expect(
      auditProblems({ 'src/data/audit-repository.ts': 'INSERT INTO audit_log (id) VALUES (?)' }),
    ).toEqual([]);
    expect(
      auditProblems({ 'src/data/audit-repository.ts': 'UPDATE audit_log SET kind = ?' }),
    ).toEqual(['src/data/audit-repository.ts: update audit_log']);
  });
});
