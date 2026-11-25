import { describe, expect, it } from 'vitest';
import { parseSelfCheckArg, parseSelfCheckStatements, selfCheckScript } from './self-check';

const none = () => null;

describe('parseSelfCheckArg', () => {
  it('is off without the flag', () => {
    expect(parseSelfCheckArg(['app', '--lang=en-AU'], none)).toEqual({ kind: 'none' });
  });

  it('runs against an absolute folder that does not exist yet, or is empty', () => {
    expect(parseSelfCheckArg(['app', '--self-check=/tmp/e2e-1'], none)).toEqual({
      kind: 'run',
      dir: '/tmp/e2e-1',
    });
    expect(parseSelfCheckArg(['app', '--self-check=/tmp/e2e-2'], () => [])).toEqual({
      kind: 'run',
      dir: '/tmp/e2e-2',
    });
  });

  it('refuses a relative folder', () => {
    expect(parseSelfCheckArg(['app', '--self-check=books'], none)).toEqual({
      kind: 'invalid',
      reason: 'not-absolute',
    });
  });

  it('refuses a folder that already holds anything, such as real books', () => {
    expect(
      parseSelfCheckArg(['app', '--self-check=/Users/sample/data'], () => ['books.db']),
    ).toEqual({
      kind: 'invalid',
      reason: 'not-empty',
    });
  });
});

describe('parseSelfCheckStatements', () => {
  it('lists the statement files given, in order, and drops any that is not an absolute path', () => {
    expect(
      parseSelfCheckStatements([
        'app',
        '--self-check-statement=/tmp/a.ofx',
        '--self-check-statement=relative/b.ofx',
        '--self-check-statement=/tmp/c.ofx',
      ]),
    ).toEqual(['/tmp/a.ofx', '/tmp/c.ofx']);
    expect(parseSelfCheckStatements(['app'])).toEqual([]);
  });
});

describe('selfCheckScript', () => {
  it('is told how many files to import, and nothing else is left to fill in', () => {
    const script = selfCheckScript(4);
    expect(script).toContain('const importCount = 4;');
    expect(script).not.toContain('__IMPORT_COUNT__');
  });
});
