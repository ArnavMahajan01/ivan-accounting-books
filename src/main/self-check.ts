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

/** What the sample-data flow saw on screen. Every field comes from the real page. */
export interface SampleFlowReport {
  /** The page said "Sample data" in its toolbar, for each page tried. */
  readonly labelOn: Readonly<Record<string, boolean>>;
  /** The four Home numbers, as shown. */
  readonly homeNumbers: readonly string[];
  readonly accountsRows: number;
  readonly transactionsRows: number;
  /** Clicking a transaction opened the panel, and Escape closed it. */
  readonly panelOpened: boolean;
  readonly panelClosedByEscape: boolean;
  /** After clearing: the label is gone, and Home shows the getting-started list. */
  readonly labelGoneAfterClear: boolean;
  readonly gettingStartedAfterClear: boolean;
}

export interface SelfCheckReport {
  readonly appInfo: string | null;
  readonly dataStatus: string | null;
  readonly packaged: boolean;
  /** The first launch offered the choice between sample data and his own books. */
  readonly startChoiceShown: boolean;
  readonly sample: SampleFlowReport;
}

/**
 * Runs in the app's own page, as a person would: takes "Start my own books" on the first-launch
 * choice, reads Settings' About card, loads the sample data, looks at every page for the label,
 * the Home numbers and the lists, opens a transaction and closes it with Escape, then clears the
 * sample data and looks again. It changes nothing but the sample data, which it clears.
 */
export const SELF_CHECK_SCRIPT = `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (test, ms = 15000) => {
    const started = Date.now();
    while (Date.now() - started < ms) {
      const found = test();
      if (found) return found;
      await wait(50);
    }
    return null;
  };
  const button = (label, within = document) =>
    [...within.querySelectorAll('button')].find((b) => b.textContent.trim() === label) || null;
  const text = (selector) => {
    const element = document.querySelector(selector);
    return element ? element.textContent : null;
  };
  const labelShown = () => !!document.querySelector('main .sample-data-label');

  const startChoiceShown = !!(await until(() => button('Start my own books')));
  const own = button('Start my own books');
  if (own) own.click();
  await until(() => document.querySelector('nav[aria-label="Main"]'));

  location.hash = '#/settings';
  await until(() => document.querySelector('[data-testid="app-info"]') && document.querySelector('[data-testid="data-status"]'));
  const appInfo = text('[data-testid="app-info"]');
  const dataStatus = text('[data-testid="data-status"]');

  const load = await until(() => button('Load sample data'));
  if (load) load.click();
  await until(() => labelShown());

  const labelOn = {};
  for (const page of ['home', 'accounts', 'transactions', 'settings', 'help']) {
    location.hash = '#/' + page;
    await until(() => document.querySelector('h1'));
    await wait(100);
    labelOn[page] = labelShown();
  }

  location.hash = '#/home';
  await until(() => document.querySelectorAll('.home-number').length === 4);
  const homeNumbers = [...document.querySelectorAll('.home-number')].map((n) => n.innerText);

  // Each table is found by its own name, so rows left over from the previous page are never counted.
  const rowsOf = (name) => document.querySelectorAll('table[aria-label="' + name + '"] .table__row');
  location.hash = '#/accounts';
  await until(() => rowsOf('Chart of accounts').length > 0);
  const accountsRows = rowsOf('Chart of accounts').length;

  location.hash = '#/transactions';
  await until(() => rowsOf('Transactions').length > 0);
  const transactionsRows = rowsOf('Transactions').length;
  const firstRow = rowsOf('Transactions')[0];
  if (firstRow) firstRow.click();
  const panel = await until(() => document.querySelector('.side-panel'));
  const panelOpened = !!panel;
  if (panel) panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const panelClosedByEscape = !!(await until(() => !document.querySelector('.side-panel') && 'gone', 3000));

  location.hash = '#/settings';
  const clear = await until(() => { const b = button('Clear sample data'); return b && !b.disabled ? b : null; });
  if (clear) clear.click();
  const dialog = await until(() => document.querySelector('[role="alertdialog"]'));
  const confirm = dialog ? button('Clear sample data', dialog) : null;
  if (confirm) confirm.click();
  const gone = await until(() => !labelShown() && 'gone');
  location.hash = '#/home';
  const gettingStartedAfterClear = !!(await until(() => [...document.querySelectorAll('h2')].some((h) => h.textContent === 'Getting started')));

  return {
    appInfo, dataStatus, startChoiceShown,
    sample: {
      labelOn, homeNumbers, accountsRows, transactionsRows, panelOpened, panelClosedByEscape,
      labelGoneAfterClear: !!gone, gettingStartedAfterClear,
    },
  };
})()`;
