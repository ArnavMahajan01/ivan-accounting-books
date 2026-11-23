// Which books are open. There are two files, kept apart so the sample books can never touch the
// real ones (spec 047): `books.db` in the data folder is the real books, and `sample/books.db` is
// the sample books, with a folder of its own. Loading sample data builds that file and switches to
// it. Clearing deletes only that folder, and switches back. Nothing here ever deletes, rewrites or
// even opens `books.db` while the sample books are in use.

import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getAppMeta, setAppMeta, START_CHOICE_KEY } from '@data/app-meta-repository';
import { getBusiness } from '@data/business-repository';
import { BOOKS_FILE_NAME, type OpenError, type Store } from '@data/database';
import type { CalendarDate, Clock } from '@shared/dates';
import type { Logger } from '@shared/logger';
import { err, ok, type Result } from '@shared/result';
import type { BooksMode, BooksState } from '@shared/views';
import { buildSampleBooks } from '@services/sample/build-sample-books';

/** The sample books' folder, inside the data folder. Deleting it is all "clear" ever does. */
export const SAMPLE_FOLDER = 'sample';
const BUILDING_FILE = 'building.db';
const OWN_BOOKS = 'own';

export type SessionError =
  /** The build that goes to the client has no sample data. */
  'switch-off' | 'already-loaded' | 'not-loaded' | 'wrong-mode' | 'failed';

export interface BooksSession {
  mode(): BooksMode;
  /** The books in use: the real ones, or the sample ones. */
  store(): Result<Store, OpenError>;
  state(): BooksState;
  loadSample(): Result<void, SessionError>;
  clearSample(): Result<void, SessionError>;
  /** "Start my own books" on first launch: remembered, so the choice is not offered again. */
  startOwnBooks(): Result<void, SessionError>;
  close(): void;
}

export interface BooksSessionDeps {
  /** The data folder. */
  readonly dir: string;
  readonly openBooks: (path: string) => Result<Store, OpenError>;
  readonly clock: Clock;
  readonly log: Logger;
  readonly sampleSwitch: boolean;
  /** Fills empty books with the sample data. Replaced in tests. */
  readonly build?: (store: Store, today: CalendarDate) => void;
}

export function createBooksSession(deps: BooksSessionDeps): BooksSession {
  const realPath = join(deps.dir, BOOKS_FILE_NAME);
  const sampleDir = join(deps.dir, SAMPLE_FOLDER);
  const samplePath = join(sampleDir, BOOKS_FILE_NAME);
  const buildPath = join(sampleDir, BUILDING_FILE);
  const build = deps.build ?? ((store, today) => buildSampleBooks({ db: store.db }, today));

  let mode: BooksMode = 'real';
  let current: Result<Store, OpenError>;

  const removeSampleFolder = () => {
    rmSync(sampleDir, { recursive: true, force: true });
  };
  const closeCurrent = () => {
    if (current.ok) current.value.close();
  };

  // The sample books are used only when the build allows them and the file is there and sound.
  if (deps.sampleSwitch && existsSync(samplePath)) {
    const sample = deps.openBooks(samplePath);
    if (sample.ok) {
      mode = 'sample';
      current = sample;
    } else {
      // Damaged sample books are of no use to anyone. They are thrown away, never repaired.
      deps.log.warn('sample.discarded', { code: sample.error.code });
      removeSampleFolder();
      current = deps.openBooks(realPath);
    }
  } else {
    current = deps.openBooks(realPath);
  }

  const session: BooksSession = {
    mode: () => mode,
    store: () => current,

    state() {
      const store = current;
      const businessName = store.ok ? (getBusiness(store.value.db)?.name ?? null) : null;
      const firstLaunch =
        mode === 'real' &&
        store.ok &&
        businessName === null &&
        getAppMeta(store.value.db, START_CHOICE_KEY) === null;
      return {
        mode,
        businessName,
        sampleSwitch: deps.sampleSwitch,
        needsStartChoice: deps.sampleSwitch && firstLaunch,
      };
    },

    loadSample() {
      if (!deps.sampleSwitch) return err('switch-off');
      if (mode === 'sample') return err('already-loaded');
      removeSampleFolder();
      mkdirSync(sampleDir, { recursive: true });
      const building = deps.openBooks(buildPath);
      if (!building.ok) {
        removeSampleFolder();
        deps.log.error('sample.load-failed', { code: building.error.code });
        return err('failed');
      }
      try {
        build(building.value, deps.clock.today());
      } catch {
        // The error text can hold anything from the sample data, so only the event is logged.
        building.value.close();
        removeSampleFolder();
        deps.log.error('sample.load-failed', { code: 'build-failed' });
        return err('failed');
      }
      building.value.close();
      renameSync(buildPath, samplePath);
      const sample = deps.openBooks(samplePath);
      if (!sample.ok) {
        removeSampleFolder();
        deps.log.error('sample.load-failed', { code: sample.error.code });
        return err('failed');
      }
      // The real books are closed while the sample books are in use, so nothing can reach them.
      closeCurrent();
      current = sample;
      mode = 'sample';
      deps.log.info('sample.loaded');
      return ok(undefined);
    },

    clearSample() {
      if (!deps.sampleSwitch) return err('switch-off');
      if (mode !== 'sample') return err('not-loaded');
      closeCurrent();
      removeSampleFolder();
      current = deps.openBooks(realPath);
      mode = 'real';
      deps.log.info('sample.cleared');
      return ok(undefined);
    },

    startOwnBooks() {
      if (mode !== 'real' || !current.ok) return err('wrong-mode');
      setAppMeta(current.value.db, START_CHOICE_KEY, OWN_BOOKS);
      return ok(undefined);
    },

    close: closeCurrent,
  };
  return session;
}
