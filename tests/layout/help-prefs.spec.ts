// Help's stars, tags and Keep on screen in the built app (spec 134): a star and a tag survive a
// restart, and a guide kept on screen stays over another page. Runs with `npm run test:layout`,
// with invented sample books and a throwaway data folder.

import { _electron as electron, expect, test, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const go = (page: Page, hash: string) => page.evaluate(`location.hash = ${JSON.stringify(hash)}`);

test('stars and tags are kept, and a guide stays on screen', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'accounting-books-help-'));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    electron.launch({
      args: [join('out', 'main', 'index.js'), `--data-dir=${dir}`],
      env: env as Record<string, string>,
    });
  try {
    let app = await launch();
    let page = await app.firstWindow();
    await page.getByRole('button', { name: 'Start with sample data' }).click();
    await page.getByRole('navigation', { name: 'Main' }).waitFor();
    await go(page, '#/help');
    await page.getByRole('button', { name: 'Star Getting started' }).click();
    await go(page, '#/help/close-and-lock-a-quarter');
    await page.getByRole('button', { name: 'Tags…' }).click();
    await page.getByRole('textbox', { name: 'New tag' }).fill('quarter end');
    await page.getByRole('button', { name: 'Add tag' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Keep on screen' }).click();
    await go(page, '#/to-review');
    const panel = page.getByRole('complementary', { name: /Guide on screen/ });
    await expect(panel).toBeVisible();
    await panel.getByRole('checkbox').first().check();
    await expect(panel).toContainText('1 of 5 steps done');
    await app.close();

    app = await launch();
    page = await app.firstWindow();
    await page.getByRole('navigation', { name: 'Main' }).waitFor();
    await go(page, '#/help');
    await page.getByRole('radio', { name: '★ Starred' }).check();
    await expect(page.getByRole('link', { name: /Getting started/ })).toBeVisible();
    await page.getByRole('radio', { name: '#quarter-end' }).check();
    await expect(page.getByRole('link', { name: /Close and lock a quarter/ })).toBeVisible();
    await app.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
