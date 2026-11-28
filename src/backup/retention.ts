// Which old backups to keep (spec 136): every day's newest for a week, then each week's newest
// for a month. Older ones are removed, and only files this app made are ever looked at. Pure.

import { addDays, compareDates, type CalendarDate } from '@shared/dates';

export interface BackupOnDisk {
  readonly name: string;
  /** The day it was made, on this Mac's calendar. */
  readonly day: CalendarDate;
  /** For ordering within a day: the ISO timestamp it was made. */
  readonly at: string;
}

/** Monday of the week a day is in, as a key. */
function weekOf(day: CalendarDate): string {
  const date = new Date(`${day}T00:00:00Z`);
  const back = (date.getUTCDay() + 6) % 7;
  return addDays(day, -back);
}

/** The names of the backups to remove. The newest is always kept. */
export function backupsToRemove(backups: readonly BackupOnDisk[], today: CalendarDate): string[] {
  const newestFirst = [...backups].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const weekAgo = addDays(today, -7);
  const monthAgo = addDays(today, -35);
  const seen = new Set<string>();
  const remove: string[] = [];
  newestFirst.forEach((b, i) => {
    if (i === 0) {
      seen.add(`d${b.day}`);
      return;
    }
    let slot: string | null;
    if (compareDates(b.day, weekAgo) > 0) slot = `d${b.day}`;
    else if (compareDates(b.day, monthAgo) > 0) slot = `w${weekOf(b.day)}`;
    else slot = null;
    if (slot === null || seen.has(slot)) remove.push(b.name);
    else seen.add(slot);
  });
  return remove;
}
