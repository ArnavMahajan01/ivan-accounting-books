// A fixed set of books for tests that need handlers but not file switching.

import type { OpenError, Store } from '@data/database';
import { err, ok, type Result } from '@shared/result';
import type { BooksAccess } from './handlers';

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
