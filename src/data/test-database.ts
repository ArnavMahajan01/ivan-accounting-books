// A throwaway in-memory database built from the real migrations, for every service test.
// It never touches a file, so no test can reach the real data folder.

import { parseTimestamp } from '@shared/dates';
import { bundledMigrations, openStore, type Store } from './database';

export function createTestDatabase(): Store {
  const migrations = bundledMigrations();
  if (!migrations.ok) throw new Error(migrations.error.message);
  const time = parseTimestamp('2026-01-01T00:00:00.000Z');
  if (!time.ok) throw new Error('bad test timestamp');
  const store = openStore(':memory:', migrations.value, () => time.value);
  if (!store.ok) throw new Error(store.error.message);
  return store.value;
}
