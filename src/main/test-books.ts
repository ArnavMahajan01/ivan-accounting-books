// A fixed set of books for tests that need handlers but not file switching.

import type { ReportExports } from './report-exports';
import type { OpenError, Store } from '@data/database';
import { seededRandom } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import type { BooksAccess, StatementFiles } from './handlers';

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
  random: seededRandom(7),
  files: {
    choose: () => Promise.resolve(null),
    read: () => Promise.resolve(err('unreadable-file' as const)),
  } satisfies StatementFiles,
  exports: { save: () => Promise.resolve('cancelled' as const) } satisfies ReportExports,
};
