// Finds SQL that changes a table, in source text. The source guards use it to keep the ledger and
// the audit log writable from one place each (specs 037 and 041). It reads text, so it also finds
// a statement hidden in a template string, and it errs on the side of reporting too much.

export type SqlVerb = 'insert' | 'update' | 'delete' | 'replace' | 'alter' | 'drop';

export interface SqlWrite {
  readonly verb: SqlVerb;
  readonly table: string;
  readonly text: string;
}

const WRITE_PATTERNS: readonly (readonly [SqlVerb, string])[] = [
  ['insert', String.raw`INSERT\s+(?:OR\s+\w+\s+)?INTO\s+`],
  ['replace', String.raw`REPLACE\s+INTO\s+`],
  ['update', String.raw`UPDATE\s+(?:OR\s+\w+\s+)?`],
  ['delete', String.raw`DELETE\s+FROM\s+`],
  ['alter', String.raw`ALTER\s+TABLE\s+`],
  ['drop', String.raw`DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`],
];

/** Every statement in `text` that writes to one of `tables`, with its verb. */
export function findSqlWrites(text: string, tables: readonly string[]): SqlWrite[] {
  const names = tables.join('|');
  const found: SqlWrite[] = [];
  for (const [verb, start] of WRITE_PATTERNS) {
    const pattern = new RegExp(`\\b${start}["\`']?(${names})\\b`, 'gi');
    for (const match of text.matchAll(pattern)) {
      found.push({ verb, table: (match[1] ?? '').toLowerCase(), text: match[0] });
    }
  }
  return found;
}
