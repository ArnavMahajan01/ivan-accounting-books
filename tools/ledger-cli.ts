// A development tool for the ledger, before there are screens (spec 044):
//   npm run ledger -- init --file <path>
//   npm run ledger -- trial-balance --file <path> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
//   npm run ledger -- check --file <path>
// It always needs `--file`, and refuses any file inside the Mac's application data folder, where
// the app keeps real books. So it can never touch them. `tools/` is never packaged (spec 014).
// Invented data only: `init` makes the sample business.

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { getTrialBalance } from '@services/get-trial-balance';
import { checkBooks } from '@services/check-books';
import { setupBusiness } from '@services/setup-business';
import type { ServiceContext } from '@services/context';
import { bundledMigrations, openStore } from '@data/database';
import { systemClock } from '@main/clock';
import { systemRandom } from '@main/random';
import type { TrialBalance } from '@domain/balances';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { formatCents } from '@shared/money';

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
}

export interface CliDeps {
  /** Where the app keeps its books. Files in here are refused. */
  readonly appDataDir: string;
}

const defaultDeps: CliDeps = { appDataDir: resolve(homedir(), 'Library', 'Application Support') };

export const USAGE = `Usage: npm run ledger -- <command> --file <path to a books file>

Commands:
  init                                  make new books with the sample business and its chart
  trial-balance [--from D] [--to D]     print the trial balance (dates as YYYY-MM-DD)
  check                                 check that the books are sound and balance

--file is required. It must not be inside the app's own data folder.`;

// The sample business: invented, with an ABN that passes the check digits but belongs to no one.
const SAMPLE_BUSINESS = {
  name: 'Harbour Lane Joinery Pty Ltd',
  abn: '35 482 916 037',
  gstRegistered: true,
  gstBasis: 'cash',
  basFrequency: 'quarterly',
} as const;

interface ParsedArgs {
  readonly command: string | undefined;
  readonly flags: ReadonlyMap<string, string>;
  readonly problem: string | null;
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const flags = new Map<string, string>();
  let command: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    if (arg.startsWith('--')) {
      const [name = '', inline] = arg.slice(2).split(/=(.*)/s);
      const value = inline ?? args[i + 1];
      if (value === undefined || (inline === undefined && value.startsWith('--'))) {
        return { command, flags, problem: `--${name} needs a value` };
      }
      flags.set(name, value);
      if (inline === undefined) i += 1;
    } else if (command === undefined) {
      command = arg;
    } else {
      return { command, flags, problem: `Unexpected "${arg}"` };
    }
  }
  return { command, flags, problem: null };
}

function insideFolder(path: string, folder: string): boolean {
  const inside = relative(folder, path);
  return inside !== '' && !inside.startsWith('..') && !isAbsolute(inside);
}

function column(text: string, width: number, right = false): string {
  return right ? text.padStart(width) : text.padEnd(width);
}

export function formatTrialBalance(tb: TrialBalance): string {
  const range =
    tb.from === null && tb.to === null
      ? 'all dates'
      : `${tb.from ?? 'the start'} to ${tb.to ?? 'the end'}`;
  const lines = [`Trial balance, ${range}`, ''];
  if (tb.rows.length === 0) {
    lines.push('No entries in this range.');
  } else {
    lines.push(
      `${column('Code', 6)}${column('Account', 34)}${column('Debit', 16, true)}${column('Credit', 16, true)}`,
    );
    for (const row of tb.rows) {
      lines.push(
        `${column(row.code, 6)}${column(row.name, 34)}${column(row.debit === 0 ? '' : formatCents(row.debit), 16, true)}${column(row.credit === 0 ? '' : formatCents(row.credit), 16, true)}`,
      );
    }
  }
  lines.push(
    '',
    `${column('Total', 40)}${column(formatCents(tb.totalDebit), 16, true)}${column(formatCents(tb.totalCredit), 16, true)}`,
    `Balanced: ${tb.balanced ? 'yes' : 'NO'}`,
  );
  return lines.join('\n');
}

function readDate(flags: ReadonlyMap<string, string>, name: string): CalendarDate | null | 'bad' {
  const text = flags.get(name);
  if (text === undefined) return null;
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : 'bad';
}

/** Runs one command. Returns the exit code: 0 done, 1 the books have a problem, 2 it was used wrongly. */
export function runCli(args: readonly string[], io: CliIo, deps: CliDeps = defaultDeps): number {
  const usage = (reason: string): number => {
    io.err(`${reason}\n\n${USAGE}`);
    return 2;
  };
  const parsed = parseArgs(args);
  if (parsed.problem !== null) return usage(parsed.problem);
  const { command, flags } = parsed;
  if (command !== 'init' && command !== 'trial-balance' && command !== 'check') {
    return usage(command === undefined ? 'No command given.' : `Unknown command "${command}".`);
  }
  const file = flags.get('file');
  if (file === undefined) return usage('--file is required.');
  const path = resolve(file);
  if (insideFolder(path, resolve(deps.appDataDir))) {
    return usage(`Refusing ${path}: it is inside the app's data folder, where the real books are.`);
  }
  if (command !== 'init' && !existsSync(path)) {
    io.err(`There are no books at ${path}. Make them with: init --file ${file}`);
    return 2;
  }

  const migrations = bundledMigrations();
  if (!migrations.ok) {
    io.err(migrations.error.message);
    return 1;
  }
  const store = openStore(path, migrations.value, () => systemClock.now());
  if (!store.ok) {
    io.err(`The books did not open (${store.error.code}): ${store.error.message}`);
    return 1;
  }
  const ctx: ServiceContext = { db: store.value.db, clock: systemClock, random: systemRandom };
  try {
    switch (command) {
      case 'init': {
        const result = setupBusiness(ctx, SAMPLE_BUSINESS);
        if (!result.ok) {
          io.err(`Not set up: ${result.error}. The books were not changed.`);
          return 1;
        }
        io.out(`Books ready at ${path}. The sample business and its default chart are in.`);
        return 0;
      }
      case 'trial-balance': {
        const from = readDate(flags, 'from');
        const to = readDate(flags, 'to');
        if (from === 'bad' || to === 'bad') return usage('Dates must look like 2026-07-01.');
        const result = getTrialBalance(ctx, { from, to });
        if (!result.ok) return usage('--to is before --from.');
        io.out(formatTrialBalance(result.value));
        return result.value.balanced ? 0 : 1;
      }
      case 'check': {
        const health = checkBooks(ctx);
        if (health.problems.length === 0) {
          io.out(
            `Books check: ok (${String(health.entries)} entries, ${String(health.lines)} lines).`,
          );
          return 0;
        }
        io.err(`Books check FAILED: ${health.problems.join(', ')}.`);
        return 1;
      }
    }
  } finally {
    store.value.close();
  }
}
