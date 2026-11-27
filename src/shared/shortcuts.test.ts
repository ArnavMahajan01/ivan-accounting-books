import { describe, expect, it } from 'vitest';
import { PAGES } from './pages';
import {
  findShortcut,
  formatShortcut,
  matchesShortcut,
  shortcutForPage,
  SHORTCUTS,
  toAccelerator,
  type KeyPress,
  type Shortcut,
} from './shortcuts';

const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

function must(shortcut: Shortcut | undefined): Shortcut {
  if (shortcut === undefined) throw new Error('Missing shortcut');
  return shortcut;
}

describe('the shortcut list', () => {
  it('gives the first nine pages Command-1 to Command-9, Home first', () => {
    const first = PAGES.slice(0, 9);
    expect(first.map((p) => formatShortcut(must(shortcutForPage(p.id))))).toEqual([
      '⌘1',
      '⌘2',
      '⌘3',
      '⌘4',
      '⌘5',
      '⌘6',
      '⌘7',
      '⌘8',
      '⌘9',
    ]);
    expect(shortcutForPage('home')?.key).toBe('1');
    expect(shortcutForPage('contacts')?.key).toBe('9');
  });

  it('gives Settings the Mac Settings key, Command-comma', () => {
    const settings = shortcutForPage('settings');
    expect(settings && formatShortcut(settings)).toBe('⌘,');
    expect(settings && toAccelerator(settings)).toBe('Cmd+,');
  });

  it('gives Help the Mac Help key, Command-?', () => {
    const help = shortcutForPage('help');
    expect(help && formatShortcut(help)).toBe('⌘?');
    expect(help && toAccelerator(help)).toBe('Cmd+?');
  });

  it('has a shortcut for the first nine pages, Settings and Help, and no two on the same keys', () => {
    // Folder 10 made it eleven pages before Settings: Shared sheets and Accountant changes are in
    // the menu and the sidebar without a number key (the author decides, see the tracker).
    for (const page of PAGES) {
      const expected = PAGES.indexOf(page) < 9 || page.id === 'settings' || page.id === 'help';
      expect(shortcutForPage(page.id) !== undefined, page.id).toBe(expected);
    }
    const keys = SHORTCUTS.map((s) => toAccelerator(s));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('formatShortcut and toAccelerator', () => {
  it('write modifiers in the Mac order', () => {
    const toggle = must(SHORTCUTS.find((s) => s.id === 'toggle-sidebar'));
    expect(formatShortcut(toggle)).toBe('⌃⌘S');
    expect(toAccelerator(toggle)).toBe('Ctrl+Cmd+S');
  });
});

describe('matching a key press', () => {
  it('finds Command-1 as Home', () => {
    expect(findShortcut(press('1', { metaKey: true }))?.action).toEqual({
      kind: 'go',
      page: 'home',
    });
  });

  it('ignores a bare key, and Command with another modifier', () => {
    expect(findShortcut(press('1'))).toBeUndefined();
    expect(findShortcut(press('1', { metaKey: true, altKey: true }))).toBeUndefined();
    expect(findShortcut(press('1', { metaKey: true, shiftKey: true }))).toBeUndefined();
    expect(findShortcut(press('s', { metaKey: true }))).toBeUndefined();
  });

  it('finds Control-Command-S for the sidebar, in either case', () => {
    expect(findShortcut(press('S', { metaKey: true, ctrlKey: true }))?.action.kind).toBe(
      'toggle-sidebar',
    );
  });

  it('treats the Shift in Command-? as part of the key', () => {
    const help = must(shortcutForPage('help'));
    expect(matchesShortcut(help, press('?', { metaKey: true, shiftKey: true }))).toBe(true);
    expect(matchesShortcut(help, press('?', { metaKey: true }))).toBe(true);
    expect(matchesShortcut(help, press('/', { metaKey: true }))).toBe(false);
  });
});
