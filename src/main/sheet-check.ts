// Runs the sheet check (spec 116) every two minutes while the app is open, and on demand when the
// Accountant changes page opens. One run at a time. Only while Google is connected; it reads, and
// never changes the books. Logs counts only.

import type { Clock } from '@shared/dates';
import type { RandomSource } from '@shared/ids';
import type { Logger } from '@shared/logger';
import type { ChangesCheck } from '@shared/sheets';
import { checkSheets } from '@google/read-back';
import type { BooksAccess } from './handlers';
import type { GoogleAccess } from './google-setup';

export const CHECK_EVERY_MS = 2 * 60 * 1000;

export interface SheetCheck {
  run(): Promise<ChangesCheck>;
  start(): void;
  stop(): void;
}

export function createSheetCheck(deps: {
  readonly books: Pick<BooksAccess, 'store'>;
  readonly google: GoogleAccess;
  readonly clock: Clock;
  readonly random: RandomSource;
  readonly log: Logger;
  readonly everyMs?: number;
}): SheetCheck {
  let running: Promise<ChangesCheck> | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const once = async (): Promise<ChangesCheck> => {
    const status = await deps.google.connection.status();
    if (status.kind !== 'connected') return { added: 0, problem: 'not-connected' };
    const store = deps.books.store();
    if (!store.ok) return { added: 0, problem: 'failed' };
    const result = await checkSheets(
      { db: store.value.db, clock: deps.clock, random: deps.random },
      deps.google.api,
    );
    deps.log.info('sheets.checked', { read: result.read, added: result.added });
    return {
      added: result.added,
      problem:
        result.stopped === null
          ? null
          : result.stopped === 'offline' || result.stopped === 'needs-sign-in'
            ? result.stopped
            : 'failed',
    };
  };

  const run = () => {
    running ??= once().finally(() => {
      running = null;
    });
    return running;
  };

  return {
    run,
    start() {
      timer ??= setInterval(() => {
        void run();
      }, deps.everyMs ?? CHECK_EVERY_MS);
    },
    stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}
