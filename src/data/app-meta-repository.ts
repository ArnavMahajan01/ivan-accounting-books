// Small facts about these books that are not accounting: `app_meta` holds the schema version, and
// the choices made on first launch.

import type { Db } from './database';

export const START_CHOICE_KEY = 'start_choice';

export function getAppMeta(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppMeta(db: Db, key: string, value: string): void {
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}
