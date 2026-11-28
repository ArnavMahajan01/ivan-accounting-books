// A fixed set of books for tests that need handlers but not file switching.

import type { ReportExports } from './report-exports';
import type { OpenError, Store } from '@data/database';
import { seededRandom } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import type { BooksAccess, StatementFiles } from './handlers';
import { createFakeGoogle, type FakeGoogle } from '@google/fake-google';
import type { GoogleAccess } from './google-setup';

/** The in-memory Google, kept in memory only, with the browser never opened. */
export function testGoogle(): GoogleAccess & { readonly fake: FakeGoogle } {
  const fake = createFakeGoogle({ path: null, now: () => '2026-11-23T01:00:00.000Z' });
  return {
    connection: fake.connection,
    api: fake.api,
    fake,
    openInBrowser: () => Promise.resolve(true),
  };
}

export function staticBooks(store: Result<Store, OpenError>): BooksAccess {
  return {
    store: () => store,
    state: () => ({
      mode: 'real',
      businessName: null,
      sampleSwitch: true,
      needsStartChoice: false,
    }),
    loadSample: () => err('failed'),
    clearSample: () => err('not-loaded'),
    startOwnBooks: () => ok(undefined),
  };
}

/** Handler dependencies for tests that do not import files: nothing is chosen and nothing reads. */
export const importDeps = {
  backups: {
    status: () =>
      Promise.resolve({ folderName: null, daily: false, lastBackupAt: null, keyReady: false }),
    chooseFolder: () => Promise.resolve({ folderName: null }),
    turnOn: () => Promise.resolve({ kind: 'refused' as const, reason: 'no-folder' as const }),
    recoveryKey: () => Promise.resolve(null),
    setDaily: (on: boolean) => on,
    backupNow: () => Promise.resolve({ kind: 'refused' as const, reason: 'no-folder' as const }),
    list: () => [],
    restore: () => Promise.resolve({ kind: 'refused' as const, reason: 'no-folder' as const }),
  },
  random: seededRandom(7),
  system: {
    appearance: () => 'system' as const,
    setAppearance: () => undefined,
    showBooksFolder: () => true,
    saveExport: () => Promise.resolve(null),
    helpPrefs: () => ({ starred: [], tags: [] }),
    saveHelpPrefs: () => undefined,
  },
  files: {
    choose: () => Promise.resolve(null),
    read: () => Promise.resolve(err('unreadable-file' as const)),
  } satisfies StatementFiles,
  exports: { save: () => Promise.resolve('cancelled' as const) } satisfies ReportExports,
  google: testGoogle(),
  clipboard: { writeText: () => undefined },
  checkSheets: () => Promise.resolve({ added: 0, problem: 'not-connected' as const }),
  invoiceFiles: {
    choose: () => Promise.resolve(null),
    read: () => Promise.resolve(err('unreadable-file' as const)),
    chooseFolder: () => Promise.resolve(null),
    list: () => Promise.resolve(null),
    openFile: () => Promise.resolve(false),
  },
  sheetPanel: {
    open: () => Promise.resolve('failed' as const),
    move: () => undefined,
    close: () => undefined,
    clearSession: () => Promise.resolve(),
  },
};
