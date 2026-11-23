// A throwaway books file, a fixed clock and a repeatable random source, for every service test.

import { createTestDatabase } from '@data/test-database';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';
import { seededRandom } from '@shared/ids';
import type { ServiceContext } from './context';

export function createTestContext(seed = 1): ServiceContext & { close(): void } {
  const store = createTestDatabase();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  const now = parseTimestamp('2026-11-23T01:00:00.000Z');
  if (!today.ok || !now.ok) throw new Error('bad test date');
  return {
    db: store.db,
    clock: fixedClock(today.value, now.value),
    random: seededRandom(seed),
    close: () => {
      store.close();
    },
  };
}
