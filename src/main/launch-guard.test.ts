import { describe, expect, it } from 'vitest';
import { debuggingFlags } from './launch-guard';

describe('debuggingFlags', () => {
  it('finds debugging flags, with or without a value', () => {
    expect(
      debuggingFlags([
        '/Applications/Accounting Books.app/Contents/MacOS/Accounting Books',
        '--inspect=9229',
        '--remote-debugging-port=0',
        '--inspect-brk',
        '--js-flags=--expose-gc',
        '--remote-debugging-pipe',
      ]),
    ).toEqual([
      'inspect',
      'remote-debugging-port',
      'inspect-brk',
      'js-flags',
      'remote-debugging-pipe',
    ]);
  });

  it('ignores ordinary arguments and look-alikes', () => {
    expect(
      debuggingFlags(['app', '--inspection', '-psn_0_12345', '--lang=en-AU', 'inspect']),
    ).toEqual([]);
  });
});
