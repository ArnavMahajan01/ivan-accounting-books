// `--self-check=<folder>` runs the real app once against a throwaway data folder, records what
// its page shows (the version line and the books status only), and quits. The packaged app
// refuses debugging, so this is how the end-to-end test checks the very app the client gets
// (spec 014). The folder must be absolute and empty, so the real books can never be opened.

import { isAbsolute } from 'node:path';

export const SELF_CHECK_FILE = 'self-check.json';
const FLAG = '--self-check=';

export type SelfCheckArg =
  | { readonly kind: 'none' }
  | { readonly kind: 'invalid'; readonly reason: 'not-absolute' | 'not-empty' }
  | { readonly kind: 'run'; readonly dir: string };

/** `existingEntries` lists the folder's contents, or null if it does not exist yet. */
export function parseSelfCheckArg(
  argv: readonly string[],
  existingEntries: (dir: string) => readonly string[] | null,
): SelfCheckArg {
  const arg = argv.find((a) => a.startsWith(FLAG));
  if (arg === undefined) return { kind: 'none' };
  const dir = arg.slice(FLAG.length);
  if (!isAbsolute(dir)) return { kind: 'invalid', reason: 'not-absolute' };
  const entries = existingEntries(dir);
  if (entries !== null && entries.length > 0) return { kind: 'invalid', reason: 'not-empty' };
  return { kind: 'run', dir };
}

export interface SelfCheckReport {
  readonly appInfo: string | null;
  readonly dataStatus: string | null;
  readonly packaged: boolean;
}

/**
 * Runs in the app's own page. Waits for both status lines and returns their text.
 * Reads only those two elements, never the rest of the page.
 */
export const READ_STATUS_SCRIPT = `new Promise((resolve) => {
  const started = Date.now();
  const timer = setInterval(() => {
    const info = document.querySelector('[data-testid="app-info"]');
    const data = document.querySelector('[data-testid="data-status"]');
    if ((info && data) || Date.now() - started > 15000) {
      clearInterval(timer);
      resolve({ appInfo: info ? info.textContent : null, dataStatus: data ? data.textContent : null });
    }
  }, 50);
})`;
