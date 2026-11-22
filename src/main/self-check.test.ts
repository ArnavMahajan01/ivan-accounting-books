import { describe, expect, it } from 'vitest';
import { parseSelfCheckArg } from './self-check';

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
