import { useEffect, useRef } from 'react';
import { assertNever } from '@shared/kinds';
import { pageHash } from '@shared/pages';
import { findShortcut } from '@shared/shortcuts';

/**
 * Runs the shortcuts in @shared/shortcuts. The Mac menu offers the same page shortcuts; whichever
 * sees the key first handles it, and opening the same page twice is harmless.
 */
export function useShortcuts(onToggleSidebar: () => void): void {
  const toggle = useRef(onToggleSidebar);
  toggle.current = onToggleSidebar;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const shortcut = findShortcut(event);
      if (shortcut === undefined) return;
      event.preventDefault();
      const { action } = shortcut;
      switch (action.kind) {
        case 'go':
          window.location.hash = pageHash(action.page);
          break;
        case 'toggle-sidebar':
          toggle.current();
          break;
        default:
          assertNever(action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
