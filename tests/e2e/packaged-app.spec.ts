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

test('the packaged app opens new books and shows its version and integrity', async () => {
  expect(existsSync(binary), `Packaged app missing at ${binary}`).toBe(true);
  const dataDir = join(dir, 'data');

  expect(await run([`--self-check=${dataDir}`])).toBe(0);

  const report = JSON.parse(readFileSync(join(dataDir, 'self-check.json'), 'utf8')) as unknown;
  expect(report).toEqual({
    appInfo: 'Version 0.0.0',
    dataStatus: 'Schema version 1, integrity: ok',
    packaged: true,
  });
  expect(existsSync(join(dataDir, 'books.db'))).toBe(true);
  const log = readFileSync(join(dataDir, 'logs', 'app.log'), 'utf8');
  expect(log).toContain('"event":"books.opened"');
  expect(log).toContain('"event":"app.self-check-finished"');
});

test('self-check refuses a folder that already holds anything', async () => {
  writeFileSync(join(dir, 'books.db'), 'not real books');
  expect(await run([`--self-check=${dir}`])).toBe(2);
  expect(readFileSync(join(dir, 'books.db'), 'utf8')).toBe('not real books');
  expect(existsSync(join(dir, 'self-check.json'))).toBe(false);
});
