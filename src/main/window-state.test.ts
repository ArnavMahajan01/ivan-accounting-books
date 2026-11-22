import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isVisibleOn, loadWindowBounds, saveWindowBounds, WINDOW_STATE_FILE } from './window-state';

const screen = { x: 0, y: 0, width: 1512, height: 982 };
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'window-state-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('window bounds', () => {
  it('saves and loads the size and place', () => {
    const bounds = { x: 40, y: 30, width: 1300, height: 820 };
    saveWindowBounds(dir, bounds);
    expect(loadWindowBounds(dir, [screen])).toEqual(bounds);
  });

  it('gives nothing when there is no file, or it is not valid', () => {
    expect(loadWindowBounds(dir, [screen])).toBeNull();
    for (const text of [
      'not json',
      '{"x":1}',
      '{"x":0,"y":0,"width":500,"height":400}',
      '{"x":0.5,"y":0,"width":1200,"height":800}',
    ]) {
      writeFileSync(join(dir, WINDOW_STATE_FILE), text);
      expect(loadWindowBounds(dir, [screen])).toBeNull();
    }
  });

  it('ignores a place that is no longer on any screen, such as an unplugged display', () => {
    saveWindowBounds(dir, { x: 3000, y: 0, width: 1200, height: 800 });
    expect(loadWindowBounds(dir, [screen])).toBeNull();
    expect(
      loadWindowBounds(dir, [screen, { x: 2560, y: 0, width: 2560, height: 1440 }]),
    ).not.toBeNull();
  });

  it('needs at least 100 by 100 of the window on a screen', () => {
    expect(isVisibleOn({ x: 1450, y: 0, width: 1200, height: 800 }, [screen])).toBe(false);
    expect(isVisibleOn({ x: 1400, y: 0, width: 1200, height: 800 }, [screen])).toBe(true);
  });
});
