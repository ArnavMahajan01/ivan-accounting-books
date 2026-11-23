// Spec 035: GST is worked out in src/domain/gst.ts and nowhere else. A second copy of the rule is
// how one figure ends up a cent different from another (risk L6). This searches the source for the
// two usual ways of writing it by hand: dividing by 11 and multiplying by 0.1.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED = new Set(['src/domain/gst.ts', 'src/domain/gst.test.ts']);
// `/ 11`, `/11`, `/ 1.1`, `* 0.1`, `*0.1`, `* .1`, but not `/ 110` or `/ 11.5` or `0.11`.
// A date such as 21/11/2026 has `/11/`, so a slash after the 11 rules a match out.
const HAND_WRITTEN_GST = /\/\s*11(?![\d./])|\/\s*1\.1(?!\d)|\*\s*0?\.1(?!\d)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

export function handWrittenGst(text: string): string[] {
  // Comments and strings are searched too: a line like "divide by 11" is a sign of the same thing.
  return [...text.matchAll(HAND_WRITTEN_GST)].map((m) => m[0]);
}

describe('GST maths', () => {
  it('is written only in src/domain/gst.ts', () => {
    const offenders = sourceFiles('src')
      .filter((file) => !ALLOWED.has(relative('.', file)))
      .flatMap((file) =>
        handWrittenGst(readFileSync(file, 'utf8')).map((hit) => `${relative('.', file)}: ${hit}`),
      );
    expect(offenders).toEqual([]);
  });

  it('is caught by the search', () => {
    expect(handWrittenGst('const gst = total / 11;')).toEqual(['/ 11']);
    expect(handWrittenGst('const gst = total*0.1; const g = t / 1.1;')).toEqual(['*0.1', '/ 1.1']);
    expect(handWrittenGst("parse('21/11/2026', 'DD/MM/YYYY')")).toEqual([]);
    expect(handWrittenGst('const a = x / 110; const b = y * 0.11; const c = z / 11.5;')).toEqual(
      [],
    );
  });
});
