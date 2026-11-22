// What the app reports about the books: the schema version, or why they did not open.

import type { DataStatus } from '@shared/bridge-contract';
import type { Result } from '@shared/result';
import type { OpenError, Store } from '@data/database';

export function dataStatus(store: Result<Store, OpenError>): DataStatus {
  return store.ok
    ? { schemaVersion: store.value.schemaVersion, integrity: 'ok', problem: null }
    : { schemaVersion: null, integrity: null, problem: store.error.code };
}
