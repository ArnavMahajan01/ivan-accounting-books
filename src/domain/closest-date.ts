// Picks the item dated nearest a day, within a window. Used to pair the two sides of a transfer
// (spec 073) and to match a bank line with an entry already in the books (spec 069a). Ties go to
// the earlier day, then to the lower id, so the answer never depends on the order given.

import { compareDates, daysBetween, type CalendarDate } from '@shared/dates';

export interface Dated {
  readonly id: string;
  readonly date: CalendarDate;
}

export function closestByDate<T extends Dated>(
  day: CalendarDate,
  items: readonly T[],
  maxDays: number,
): T | null {
  let best: { item: T; gap: number } | null = null;
  for (const item of items) {
    const gap = Math.abs(daysBetween(day, item.date));
    if (gap > maxDays) continue;
    if (
      best === null ||
      gap < best.gap ||
      (gap === best.gap &&
        (compareDates(item.date, best.item.date) < 0 ||
          (item.date === best.item.date && item.id < best.item.id)))
    ) {
      best = { item, gap };
    }
  }
  return best?.item ?? null;
}
