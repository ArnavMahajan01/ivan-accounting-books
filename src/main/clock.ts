// The real clock. It lives in the main process, not in src/shared, so pure code cannot reach it
// and has to be given a Clock or a date instead.

import type { CalendarDate, Clock, Timestamp } from '@shared/dates';

export const systemClock: Clock = {
  today(): CalendarDate {
    // Local getters, not toISOString: in Australia the UTC date is often still yesterday.
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` as CalendarDate;
  },
  now(): Timestamp {
    return new Date().toISOString() as Timestamp;
  },
};
