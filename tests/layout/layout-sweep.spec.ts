// Opens every page, and the sheets and panels, at several window sizes, and fails if anything
// breaks as the window changes size (see page-checks.ts). The screenshots go to
// test-results/layout/ so they can be looked at. Runs the built app with invented sample data and
// a throwaway data folder, never the real books.

import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PAGE_CHECKS } from './page-checks';

// The smallest the window can be, and sizes up to a large screen.
const SIZES = [
  [1100, 700],
  [1280, 800],
  [1440, 900],
  [1700, 1000],
] as const;

const FIXTURE = join('tests', 'fixtures', 'westpac', 'business-one-2-13-nov-2026.ofx');
// Lines the sample books do not hold, so To review has rows with accounts, splits and transfers.
const DEMO_4 = join('tests', 'fixtures', 'westpac', 'business-one-21-23-nov-2026-demo-4.ofx');
const SHOTS = join('test-results', 'layout');

const PAGES = [
  ['home', '#/home'],
  ['to-review', '#/to-review'],
  ['bank', '#/bank'],
  ['transactions', '#/transactions'],
  ['accounts', '#/accounts'],
  ['reports', '#/reports'],
  ['shared-sheets', '#/shared-sheets'],
  ['accountant-changes', '#/accountant-changes'],
  ['settings', '#/settings'],
  ['help', '#/help'],
  ['help-guide', '#/help/import-a-westpac-file'],
] as const;

async function problemsOn(
  page: Page,
  name: string,
  size: readonly [number, number],
): Promise<string[]> {
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(SHOTS, `${name}-${String(size[0])}.png`) });
  const found = await page.evaluate<string[]>(PAGE_CHECKS);
  return found.map((problem) => `${name} at ${String(size[0])} wide: ${problem}`);
}

// Moves to a page by its address. Written as a string because these tests have no DOM types.
const go = (page: Page, hash: string) => page.evaluate(`location.hash = ${JSON.stringify(hash)}`);

let dir: string;
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'accounting-books-layout-'));
  mkdirSync(SHOTS, { recursive: true });
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    args: [join('out', 'main', 'index.js'), `--data-dir=${dir}`],
    env: env as Record<string, string>,
  });
  page = await app.firstWindow();
  await page.getByRole('button', { name: 'Start with sample data' }).click();
  await page.getByRole('navigation', { name: 'Main' }).waitFor();
  // One file is imported, so the Bank page has a statement, lines waiting and a last import.
  await app.evaluate(
    ({ dialog }, path) => {
      dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [path] });
    },
    join(process.cwd(), FIXTURE),
  );
  await go(page, '#/bank');
  for (const file of [FIXTURE, DEMO_4]) {
    await app.evaluate(
      ({ dialog }, path) => {
        dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [path] });
      },
      join(process.cwd(), file),
    );
    await page.getByRole('button', { name: 'Import file' }).click();
    await page.locator('[role="dialog"] .button--main').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  }
});

test.afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

test('no page, sheet or panel breaks at any window size', async () => {
  const problems: string[] = [];
  for (const size of SIZES) {
    await app.evaluate(
      ({ BrowserWindow }, [width, height]) => {
        BrowserWindow.getAllWindows()[0]?.setSize(width ?? 1100, height ?? 700);
      },
      [...size],
    );
    for (const [name, hash] of PAGES) {
      await go(page, hash);
      await page.locator('h1').first().waitFor();
      problems.push(...(await problemsOn(page, name, size)));
    }

    // The transaction panel, over the list.
    await go(page, '#/transactions');
    await page.locator('table[aria-label="Transactions"] .table__row').first().waitFor();
    await page.locator('table[aria-label="Transactions"] .table__row').nth(1).click();
    await page.locator('.side-panel').waitFor();
    problems.push(...(await problemsOn(page, 'transaction-panel', size)));
    await page.keyboard.press('Escape');

    // To review's Split and Transfer sheets.
    await go(page, '#/to-review');
    await page.getByRole('button', { name: 'Split OFFICEWORKS 0412' }).click();
    await page.getByRole('dialog').waitFor();
    problems.push(...(await problemsOn(page, 'split-sheet', size)));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Transfer TRANSFER TO CASH RESERVE 7730' }).click();
    await page.getByRole('dialog').waitFor();
    problems.push(...(await problemsOn(page, 'transfer-sheet', size)));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });

    // The import sheet, and the question about taking an import back.
    await go(page, '#/bank');
    await page.getByRole('button', { name: 'Import file' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByText('See all lines').click();
    problems.push(...(await problemsOn(page, 'import-sheet', size)));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /^Undo import of/ }).click();
    await page.getByRole('alertdialog').waitFor();
    problems.push(...(await problemsOn(page, 'undo-question', size)));
    await page.keyboard.press('Escape');
  }
  // Written out too, one to a line, so a long list is easy to read.
  writeFileSync(join(SHOTS, 'problems.txt'), `${problems.join('\n')}\n`);
  expect(problems).toEqual([]);
});
