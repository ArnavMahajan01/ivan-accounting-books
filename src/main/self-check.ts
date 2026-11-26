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

const STATEMENT_FLAG = '--self-check-statement=';

/**
 * The statement files a self-check should "choose" in turn, instead of opening the Mac's file
 * chooser (which nothing can click). Only absolute paths count, and the caller uses them only when
 * the self-check itself is running, so no normal launch can be steered to a file this way.
 */
export function parseSelfCheckStatements(argv: readonly string[]): string[] {
  return argv
    .filter((a) => a.startsWith(STATEMENT_FLAG))
    .map((a) => a.slice(STATEMENT_FLAG.length))
    .filter((path) => isAbsolute(path));
}

/** What the import sheet said for one file, and what the sidebar and Bank page showed after. */
export interface ImportStepReport {
  /** The sentences at the top of the sheet. */
  readonly sentences: string;
  /** The closing balance check. */
  readonly check: string;
  /** The label of the main action, such as `Import 11 lines`, or null if there was none. */
  readonly mainAction: string | null;
  /** The sheet's heading after importing, such as `11 lines added to To review`. */
  readonly done: string | null;
  /** The sidebar's To review item after the step. */
  readonly toReview: string;
}

export interface ImportFlowReport {
  readonly steps: readonly ImportStepReport[];
  /** The Bank page's rows after the last step. */
  readonly bankRows: readonly string[];
  /** Taking the last import back from the Bank page: what was offered, what was said, and the sidebar after. */
  readonly undo: {
    readonly offered: string;
    readonly notice: string;
    readonly toReview: string;
  } | null;
}

/** What the sample-data flow saw on screen. Every field comes from the real page. */
/** Reconciling Business One to the last statement from the Bank page (spec 086). */
export interface ReconcileFlowReport {
  /** The sheet's sentence about the difference. */
  readonly said: string;
  /** The Bank page's message after Finish. */
  readonly notice: string;
}

/** Reports (folder 08): a report saved and reopened, and the last quarter closed and locked. */
export interface ReportsFlowReport {
  /** The saved report's columns, read again after opening it from My reports. */
  readonly reopenedColumns: string;
  /** The message after locking the quarter. */
  readonly locked: string;
}

/** To review after the imports (folder 06): a line posted with an account, and a payee saved. */
export interface ReviewFlowReport {
  /** The message after posting one line with an account typed and Return. */
  readonly posted: string;
  /** The message after saving a From/To. */
  readonly payee: string;
  /** Transactions rows found by searching for the posted line's description. */
  readonly inTransactions: string;
}

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
  /** Empty unless statement files were given to import. */
  readonly imports: ImportFlowReport;
  /** Empty unless statement files were given to import. */
  readonly review: ReviewFlowReport;
  /** Empty unless statement files were given to import. */
  readonly reconcile: ReconcileFlowReport;
  readonly reports: ReportsFlowReport;
}

/**
 * Runs in the app's own page, as a person would: takes "Start my own books" on the first-launch
 * choice, reads Settings' About card, loads the sample data, looks at every page for the label,
 * the Home numbers and the lists, opens a transaction and closes it with Escape, then clears the
 * sample data and looks again. It changes nothing but the sample data, which it clears.
 */
export function selfCheckScript(importCount: number): string {
  return SELF_CHECK_SOURCE.replace('__IMPORT_COUNT__', String(importCount));
}

const SELF_CHECK_SOURCE = `(async () => {
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

  const imports = { steps: [], bankRows: [], undo: null };
  const importCount = __IMPORT_COUNT__;
  if (importCount > 0) {
    location.hash = '#/bank';
    await until(() => rowsOf('Bank accounts').length > 0);
    const inDialog = (dialog, selector) => { const el = dialog.querySelector(selector); return el ? el.innerText : ''; };
    for (let i = 0; i < importCount; i += 1) {
      const start = await until(() => { const b = button('Import file'); return b && !b.disabled ? b : null; });
      if (!start) break;
      start.click();
      const dialog = await until(() => document.querySelector('[role="dialog"]'));
      if (!dialog) break;
      const main = dialog.querySelector('.button--main');
      const step = {
        sentences: inDialog(dialog, '.import-sheet__plain'),
        check: inDialog(dialog, '.import-sheet__check'),
        mainAction: main ? main.textContent.trim() : null,
        done: null,
        toReview: '',
      };
      if (main && main.textContent.trim().startsWith('Import ')) {
        main.click();
        const finished = await until(() => {
          const h = document.querySelector('[role="dialog"] h2');
          return h && h.textContent.endsWith('added to To review') ? h : null;
        });
        step.done = finished ? finished.textContent : null;
        const done = await until(() => button('Done', document.querySelector('[role="dialog"]') || document));
        if (done) done.click();
      } else {
        const close = button('Close', dialog);
        if (close) close.click();
      }
      await until(() => !document.querySelector('[role="dialog"]') && 'gone');
      await wait(150);
      const link = [...document.querySelectorAll('nav[aria-label="Main"] a')].find((a) => a.textContent.startsWith('To review'));
      step.toReview = link ? link.textContent.trim() : '';
      imports.steps.push(step);
    }
    imports.bankRows = [...rowsOf('Bank accounts')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim());

    // Take the last import back, as he would: the button, the question, the answer.
    const undoButton = await until(() => [...document.querySelectorAll('main button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Undo import of')) || null);
    if (undoButton) {
      const offeredEl = document.querySelector('.bank__last-text');
      const offered = offeredEl ? offeredEl.innerText.replace(/\\s+/g, ' ').trim() : '';
      undoButton.click();
      const asking = await until(() => document.querySelector('[role="alertdialog"]'));
      const confirmUndo = asking ? button('Undo import', asking) : null;
      if (confirmUndo) confirmUndo.click();
      const noticeEl = await until(() => document.querySelector('.bank__notice'));
      await wait(250);
      const reviewLink = [...document.querySelectorAll('nav[aria-label="Main"] a')].find((a) => a.textContent.startsWith('To review'));
      imports.undo = {
        offered,
        notice: noticeEl ? noticeEl.innerText : '',
        toReview: reviewLink ? reviewLink.textContent.trim() : '',
      };
    }
  }

  // Reconcile Business One to its last statement, filled in from the import, as he would.
  const reconcile = { said: '', notice: '' };
  if (importCount > 0) {
    location.hash = '#/bank';
    const open = await until(() => [...document.querySelectorAll('main button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Reconcile Business One')) || null);
    if (open) {
      open.click();
      const sheet = await until(() => document.querySelector('[role="dialog"]'));
      const said = sheet ? await until(() => sheet.querySelector('.transfer__found')) : null;
      reconcile.said = said ? said.innerText.replace(/\\s+/g, ' ').trim() : '';
      const finish = sheet ? await until(() => { const b = button('Finish', sheet); return b && !b.disabled ? b : null; }) : null;
      if (finish) finish.click();
      const notice = await until(() => { const n = document.querySelector('.bank__notice'); return n && n.textContent.includes('reconciled') ? n : null; });
      reconcile.notice = notice ? notice.innerText.replace(/\\s+/g, ' ').trim() : '';
    }
  }

  // To review, as he would: an account typed on a line instead of its match, then Return; a payee
  // typed and Return; then the posted line looked up in Transactions.
  const review = { posted: '', payee: '', inTransactions: '' };
  if (importCount > 0) {
    const setValue = (el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const press = (el, key) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    const rowWith = (words) => [...rowsOf('Bank lines')].find((r) => r.textContent.includes(words)) || null;
    const fieldIn = (words, label) => { const r = rowWith(words); return r ? r.querySelector('input[aria-label^="' + label + '"]') : null; };
    const noticeSaying = (start) => { const n = document.querySelector('.review__notice'); return n && n.textContent.includes(start) ? n : null; };
    location.hash = '#/to-review';
    const rent = await until(() => rowWith('WORKSHOP RENT'));
    const insteadRent = rent ? button('Choose an account instead', rent) : null;
    if (insteadRent) insteadRent.click();
    const account = await until(() => fieldIn('WORKSHOP RENT', 'Account for'));
    if (account) {
      setValue(account, '6080');
      await wait(150);
      press(fieldIn('WORKSHOP RENT', 'Account for') || account, 'Enter');
    }
    const posted = await until(() => noticeSaying('posted'));
    review.posted = posted ? posted.innerText.replace(/\\s+/g, ' ').trim() : '';
    await wait(500);
    const ampol = await until(() => rowWith('AMPOL ALEXANDRIA'));
    const insteadAmpol = ampol ? button('Choose an account instead', ampol) : null;
    if (insteadAmpol) insteadAmpol.click();
    const payee = await until(() => fieldIn('AMPOL ALEXANDRIA', 'From/To for'));
    if (payee) {
      payee.focus();
      setValue(payee, 'Ampol Alexandria');
      await wait(150);
      press(fieldIn('AMPOL ALEXANDRIA', 'From/To for') || payee, 'Enter');
    }
    const saved = await until(() => noticeSaying('Saved'));
    review.payee = saved ? saved.innerText.replace(/\\s+/g, ' ').trim() : '';
    location.hash = '#/transactions';
    const search = await until(() => document.querySelector('input[aria-label="Search transactions"]'));
    if (search) setValue(search, 'WORKSHOP RENT');
    await wait(1000);
    review.inTransactions = [...rowsOf('Transactions')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()).join(' | ');
  }

  // Reports, as he would: save the profit and loss with a column, reopen it, then close the quarter.
  const reports = { reopenedColumns: '', locked: '' };
  {
    const field = (name) => [...document.querySelectorAll('input')].find((i) => {
      const label = i.closest('label');
      return label && label.textContent.trim().startsWith(name);
    }) || null;
    const setText = (el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    location.hash = '#/reports/profit-and-loss';
    await until(() => document.querySelector('table.report'));
    const customise = await until(() => button('Customise'));
    if (customise) customise.click();
    const last = await until(() => field('Last period'));
    if (last) last.click();
    await wait(400);
    const saveAs = await until(() => button('Save as my report'));
    if (saveAs) saveAs.click();
    const name = await until(() => field('Name'));
    if (name) {
      setText(name, 'Self-check report');
      await wait(100);
      const sheet = name.closest('[role="dialog"]');
      const save = sheet ? button('Save', sheet) : null;
      if (save) save.click();
    }
    await until(() => document.querySelector('.review__notice'));
    location.hash = '#/reports';
    const link = await until(() => [...document.querySelectorAll('a')].find((a) => a.textContent === 'Self-check report') || null);
    if (link) link.click();
    await until(() => document.querySelectorAll('table.report thead th').length > 2);
    await wait(300);
    const head = document.querySelector('table.report thead');
    reports.reopenedColumns = head ? head.innerText.replace(/\\s+/g, ' ').trim() : '';

    location.hash = '#/reports/close';
    const lock = await until(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Lock ') && b.textContent.trim().endsWith('…')) || null);
    if (lock) lock.click();
    const ask = await until(() => document.querySelector('[role="alertdialog"]'));
    const tick = ask ? ask.querySelector('input[type="checkbox"]') : null;
    if (tick) tick.click();
    await wait(100);
    const confirmLock = ask ? [...ask.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Lock ') && !b.disabled) : null;
    if (confirmLock) confirmLock.click();
    const notice = await until(() => { const n = document.querySelector('.review__notice'); return n && n.textContent.includes('locked') ? n : null; });
    reports.locked = notice ? notice.innerText.replace(/\\s+/g, ' ').trim() : '';
  }

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
    imports,
    review,
    reconcile,
    reports,
  };
})()`;
