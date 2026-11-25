// Launches the packaged app, the same one the client gets, against a throwaway data folder.
// The packaged app refuses debugging, so it runs in self-check mode (src/main/self-check.ts):
// it records its two status lines into the folder and quits.

import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
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

// The invented Westpac files, in the order the demo imports them: the clean file, the same file
// again, the overlapping file, and the file with a line that cannot be read.
const STATEMENTS = [
  'business-one-2-13-nov-2026.ofx',
  'business-one-2-13-nov-2026.ofx',
  'business-one-9-20-nov-2026.ofx',
  'business-one-16-23-nov-2026-bad-date.ofx',
];

test('the packaged app opens new books, and loads and clears the sample data from its own screens', async () => {
  expect(existsSync(binary), `Packaged app missing at ${binary}`).toBe(true);
  const dataDir = join(dir, 'data');
  const statementDir = join(dir, 'statements');
  mkdirSync(statementDir);
  const statementFlags = STATEMENTS.map((name, index) => {
    const path = join(statementDir, `${String(index)}-${name}`);
    copyFileSync(join('tests', 'fixtures', 'westpac', name), path);
    return `--self-check-statement=${path}`;
  });

  expect(await run([`--self-check=${dataDir}`, ...statementFlags])).toBe(0);

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
    imports: {
      steps: {
        sentences: string;
        check: string;
        mainAction: string | null;
        done: string | null;
        toReview: string;
      }[];
      bankRows: string[];
      undo: { offered: string; notice: string; toReview: string } | null;
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

  // Importing: each of the four files, as the client would drop them in.
  const { steps, bankRows } = report.imports;
  expect(steps).toHaveLength(4);
  const [clean, again, overlap, problem] = steps;
  expect(clean?.sentences).toContain(
    'This file is for Business One ··4821, from 02/11/2026 to 13/11/2026.',
  );
  expect(clean?.sentences).toContain('11 new lines will go to To review.');
  expect(clean?.check).toContain('First file for this account.');
  expect(clean?.mainAction).toBe('Import 11 lines');
  expect(clean?.done).toBe('11 lines added to To review');
  expect(clean?.toReview).toBe('To review11');
  // The same file again adds nothing, and says so.
  expect(again?.sentences).toContain('Nothing is new.');
  expect(again?.sentences).toContain('11 lines are already in your books');
  expect(again?.mainAction).toBe('Close');
  expect(again?.toReview).toBe('To review11');
  // The overlapping file: the days already imported are skipped, and the balance matches.
  expect(overlap?.sentences).toContain('7 new lines will go to To review.');
  expect(overlap?.sentences).toContain('6 lines are already in your books');
  expect(overlap?.check).toContain('Closing balance matches.');
  expect(overlap?.check).toContain(
    'File: $18,642.35 on 20/11/2026. Your books after import: $18,642.35.',
  );
  expect(overlap?.toReview).toBe('To review18');
  // The problem file: one line is refused with its reason, and the difference is that line.
  expect(problem?.sentences).toContain(
    '1 line could not be read: line 81 has the date "31/11/2026", which is not a real date.',
  );
  expect(problem?.sentences).toContain('3 new lines will go to To review.');
  expect(problem?.check).toContain('Closing balance does not match.');
  expect(problem?.check).toContain('The difference, $100.00, is the line that could not be read.');
  expect(problem?.done).toBe('3 lines added to To review');
  expect(problem?.toReview).toBe('To review21');
  const businessOne = bankRows.find((row) => row.startsWith('Business One'));
  expect(businessOne).toContain('21 lines');
  expect(businessOne).toContain('$20,898.35 as at 23/11/2026');
  // Taking the last import back: it is offered by name, three lines leave, and the count goes back.
  expect(report.imports.undo?.offered).toContain(
    'Business One ··4821: 3-business-one-16-23-nov-2026-bad-date.ofx, 3 lines added',
  );
  expect(report.imports.undo?.notice).toBe(
    '3 lines removed from To review. You can import 3-business-one-16-23-nov-2026-bad-date.ofx again.',
  );
  expect(report.imports.undo?.toReview).toBe('To review18');

  expect(existsSync(join(dataDir, 'books.db'))).toBe(true);
  expect(existsSync(join(dataDir, 'sample')), 'Clearing leaves no sample folder behind').toBe(
    false,
  );
  const log = readFileSync(join(dataDir, 'logs', 'app.log'), 'utf8');
  expect(log).toContain('"event":"books.opened"');
  expect(log).toContain('"event":"books.checked"');
  expect(log).not.toContain('books.check-failed');
  expect(log).toContain('"event":"app.self-check-finished"');
  // Importing is logged by count, and never by what a statement holds.
  expect(log).toContain('"event":"import.imported"');
  expect(log).toContain('"event":"import.undone"');
  expect(log).not.toMatch(/BUNNINGS|AMPOL|SMITH RENOVATIONS|WORKSHOP RENT|4821/);
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
