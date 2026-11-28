import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HELP_PREFS_FILE, loadHelpPrefs, saveHelpPrefs } from './help-prefs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'help-prefs-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('Help stars and tags on this Mac (spec 134)', () => {
  it('start empty, and are kept', () => {
    expect(loadHelpPrefs(dir)).toEqual({ starred: [], tags: [] });
    const prefs = {
      starred: ['getting-started'],
      tags: [{ name: 'quarter-end', guides: ['close-and-lock-a-quarter'] }],
    };
    saveHelpPrefs(dir, prefs);
    expect(loadHelpPrefs(dir)).toEqual(prefs);
  });

  it('ignore a file they cannot trust', () => {
    writeFileSync(join(dir, HELP_PREFS_FILE), '{"starred":["../etc"],"tags":[]}');
    expect(loadHelpPrefs(dir)).toEqual({ starred: [], tags: [] });
  });
});
