// Every keyboard shortcut, listed once. The Mac menu (main process) takes its accelerators from
// here, and the screens take their key handling and tooltips from here, so the two cannot drift.
// This is a Mac-only app, so the Command key is always `command`.

import { PAGES, type PageId } from './pages';

export type Modifier = 'control' | 'option' | 'shift' | 'command';

export type ShortcutAction =
  { readonly kind: 'go'; readonly page: PageId } | { readonly kind: 'toggle-sidebar' };

export interface Shortcut {
  readonly id: string;
  readonly label: string;
  /** Lower case for letters and digits, as `KeyboardEvent.key` reports them. */
  readonly key: string;
  readonly modifiers: readonly Modifier[];
  readonly action: ShortcutAction;
}

const PAGE_SHORTCUT_COUNT = 9;

// Command-1 to Command-9 open the first nine pages. Settings and Help come after them, so they take
// the Mac's own keys: Command-comma for Settings, Command-? for Help.
const pageShortcuts: Shortcut[] = PAGES.map((page, index): Shortcut | null => {
  if (page.id === 'settings') {
    return {
      id: 'go-settings',
      label: 'Settings',
      key: ',',
      modifiers: ['command'],
      action: { kind: 'go', page: 'settings' },
    };
  }
  if (page.id === 'help') {
    return {
      id: 'go-help',
      label: 'Help',
      key: '?',
      modifiers: ['command'],
      action: { kind: 'go', page: 'help' },
    };
  }
  if (index >= PAGE_SHORTCUT_COUNT) return null;
  return {
    id: `go-${page.id}`,
    label: page.label,
    key: String(index + 1),
    modifiers: ['command'],
    action: { kind: 'go', page: page.id },
  };
}).filter((s): s is Shortcut => s !== null);

export const SHORTCUTS: readonly Shortcut[] = [
  ...pageShortcuts,
  {
    id: 'toggle-sidebar',
    label: 'Show or hide the sidebar',
    key: 's',
    modifiers: ['control', 'command'],
    action: { kind: 'toggle-sidebar' },
  },
];

export function findShortcutById(id: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}

export function shortcutForPage(page: PageId): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.action.kind === 'go' && s.action.page === page);
}

const SYMBOLS: Record<Modifier, string> = {
  control: '⌃',
  option: '⌥',
  shift: '⇧',
  command: '⌘',
};
// The order the Mac shows modifiers in.
const MODIFIER_ORDER: readonly Modifier[] = ['control', 'option', 'shift', 'command'];

/** For tooltips: `⌘1`, `⌃⌘S`. */
export function formatShortcut(shortcut: Shortcut): string {
  const symbols = MODIFIER_ORDER.filter((m) => shortcut.modifiers.includes(m)).map(
    (m) => SYMBOLS[m],
  );
  return `${symbols.join('')}${shortcut.key.toUpperCase()}`;
}

const ACCELERATOR_NAMES: Record<Modifier, string> = {
  control: 'Ctrl',
  option: 'Alt',
  shift: 'Shift',
  command: 'Cmd',
};

/** For the Mac menu: `Cmd+1`, `Ctrl+Cmd+S`. */
export function toAccelerator(shortcut: Shortcut): string {
  return [
    ...MODIFIER_ORDER.filter((m) => shortcut.modifiers.includes(m)).map(
      (m) => ACCELERATOR_NAMES[m],
    ),
    shortcut.key.toUpperCase(),
  ].join('+');
}

export interface KeyPress {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

const LETTER_OR_DIGIT = /^[a-z0-9]$/;

/**
 * Whether a key press is this shortcut. Shift is checked only for letters and digits: a symbol
 * such as `?` already needs Shift to type, so it is part of the key, not a modifier.
 */
export function matchesShortcut(shortcut: Shortcut, press: KeyPress): boolean {
  if (press.key.toLowerCase() !== shortcut.key) return false;
  const has = (m: Modifier) => shortcut.modifiers.includes(m);
  if (press.metaKey !== has('command')) return false;
  if (press.ctrlKey !== has('control')) return false;
  if (press.altKey !== has('option')) return false;
  return !LETTER_OR_DIGIT.test(shortcut.key) || press.shiftKey === has('shift');
}

export function findShortcut(press: KeyPress): Shortcut | undefined {
  return SHORTCUTS.find((s) => matchesShortcut(s, press));
}
