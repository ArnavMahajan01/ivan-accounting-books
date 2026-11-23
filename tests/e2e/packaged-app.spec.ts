// Launches the packaged app, the same one the client gets, against a throwaway data folder.
// The packaged app refuses debugging, so it runs in self-check mode (src/main/self-check.ts):
// it records its two status lines into the folder and quits.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const productName = (JSON.parse(readFileSync('package.json', 'utf8')) as { productName: string })
  .productName;
const binary = join('release', 'mac-arm64', `${productName}.app`, 'Contents', 'MacOS', productName);

function run(args: string[]): Promise<number | null> {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { env, stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('The packaged app did not finish within 45 seconds'));
    }, 45_000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
    child.on('error', reject);
  });
}

// The packaged app's real data folder on this Mac. No test may change anything in it.
const realLog = join(homedir(), 'Library', 'Application Support', productName, 'logs', 'app.log');
const realLogTime = () => statSync(realLog, { throwIfNoEntry: false })?.mtimeMs ?? null;

let dir: string;
let realLogBefore: number | null;
test.beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'accounting-books-e2e-'));
  realLogBefore = realLogTime();
});
test.afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  expect(realLogTime(), 'A test wrote to the real data folder').toBe(realLogBefore);
});

test('the packaged app opens new books, and loads and clears the sample data from its own screens', async () => {
  expect(existsSync(binary), `Packaged app missing at ${binary}`).toBe(true);
  const dataDir = join(dir, 'data');

  expect(await run([`--self-check=${dataDir}`])).toBe(0);

  const report = JSON.parse(readFileSync(join(dataDir, 'self-check.json'), 'utf8')) as {
    appInfo: string;
    dataStatus: string;
    packaged: boolean;
    startChoiceShown: boolean;
    sample: {
      labelOn: Record<string, boolean>;
      homeNumbers: string[];
      accountsRows: number;
      transactionsRows: number;
      panelOpened: boolean;
      panelClosedByEscape: boolean;
      labelGoneAfterClear: boolean;
      gettingStartedAfterClear: boolean;
    };
  };
  expect(report).toMatchObject({
    appInfo: 'Version 0.0.0',
    dataStatus: expect.stringMatching(/^Schema version \d+, integrity: ok$/),
    packaged: true,
    startChoiceShown: true,
  });

  // The sample data: the label on every page, real figures on Home, and both lists filled.
  const { sample } = report;
  expect(sample.labelOn).toEqual({
    home: true,
    accounts: true,
    transactions: true,
    settings: true,
    help: true,
  });
  const money = String.raw`-?\$[\d,]+\.\d{2}`;
  expect(sample.homeNumbers).toHaveLength(4);
  expect(sample.homeNumbers[0]).toMatch(new RegExp(`^Bank balance\\n${money}\\n2 accounts$`));
  expect(sample.homeNumbers[1]).toBe('Lines to review\n0\nnone waiting');
  expect(sample.homeNumbers[2]).toMatch(
    new RegExp(`^GST owing, .+\\n${money}\\nso far this period$`),
  );
  expect(sample.homeNumbers[3]).toMatch(
    new RegExp(`^Profit, FY \\d{4}–\\d{2}\\n${money}\\nsince 01/07/\\d{4}$`),
  );
  expect(sample.accountsRows).toBe(39);
  expect(sample.transactionsRows).toBeGreaterThan(0);
  expect(sample.panelOpened).toBe(true);
  expect(sample.panelClosedByEscape).toBe(true);
  // Cleared: the label is gone and the books are empty again.
  expect(sample.labelGoneAfterClear).toBe(true);
  expect(sample.gettingStartedAfterClear).toBe(true);

  expect(existsSync(join(dataDir, 'books.db'))).toBe(true);
  expect(existsSync(join(dataDir, 'sample')), 'Clearing leaves no sample folder behind').toBe(
    false,
  );
  const log = readFileSync(join(dataDir, 'logs', 'app.log'), 'utf8');
  expect(log).toContain('"event":"books.opened"');
  expect(log).toContain('"event":"books.checked"');
  expect(log).not.toContain('books.check-failed');
  expect(log).toContain('"event":"app.self-check-finished"');
  expect(log.indexOf('"event":"sample.loaded"')).toBeGreaterThan(-1);
  expect(log.indexOf('"event":"sample.cleared"')).toBeGreaterThan(
    log.indexOf('"event":"sample.loaded"'),
  );
});

test('self-check refuses a folder that already holds anything', async () => {
  writeFileSync(join(dir, 'books.db'), 'not real books');
  expect(await run([`--self-check=${dir}`])).toBe(2);
  expect(readFileSync(join(dir, 'books.db'), 'utf8')).toBe('not real books');
  expect(existsSync(join(dir, 'self-check.json'))).toBe(false);
});
