import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APPEARANCE_FILE, loadAppearance, saveAppearance } from './appearance';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'appearance-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the appearance choice (spec 133)', () => {
  it('is the same as the Mac until chosen, and is kept', () => {
    expect(loadAppearance(dir)).toBe('system');
    saveAppearance(dir, 'dark');
    expect(loadAppearance(dir)).toBe('dark');
  });

  it('ignores a file it cannot trust', () => {
    writeFileSync(join(dir, APPEARANCE_FILE), '{"appearance":"purple"}');
    expect(loadAppearance(dir)).toBe('system');
    writeFileSync(join(dir, APPEARANCE_FILE), 'not json');
    expect(loadAppearance(dir)).toBe('system');
  });
});
