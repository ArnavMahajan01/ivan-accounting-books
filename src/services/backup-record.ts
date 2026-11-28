// When these books were last backed up (spec 136), kept in the books themselves, so the sample
// books and his own each know their own. Home and Settings read it (spec 137).

import { getAppMeta, setAppMeta } from '@data/app-meta-repository';
import { parseTimestamp, type Timestamp } from '@shared/dates';
import type { ReadContext } from './context';

export const LAST_BACKUP_KEY = 'last_backup';

export function lastBackupAt(ctx: ReadContext): Timestamp | null {
  const saved = getAppMeta(ctx.db, LAST_BACKUP_KEY);
  if (saved === null) return null;
  const parsed = parseTimestamp(saved);
  return parsed.ok ? parsed.value : null;
}

export function recordBackup(ctx: ReadContext, at: Timestamp): void {
  setAppMeta(ctx.db, LAST_BACKUP_KEY, at);
}
