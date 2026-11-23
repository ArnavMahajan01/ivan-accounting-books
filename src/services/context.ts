import type { Db } from '@data/database';
import type { Clock } from '@shared/dates';
import type { RandomSource } from '@shared/ids';

/**
 * What every service needs from outside: the open books, the time and a random source. The main
 * process passes the real ones (`systemClock`, `systemRandom`). Tests pass fixed ones.
 */
export interface ServiceContext {
  readonly db: Db;
  readonly clock: Clock;
  readonly random: RandomSource;
}

/** What a service that only reads needs: the open books. */
export type ReadContext = Pick<ServiceContext, 'db'>;

/** What a service that reads and needs to know today's date needs: the open books and the clock. */
export type TodayContext = Pick<ServiceContext, 'db' | 'clock'>;
