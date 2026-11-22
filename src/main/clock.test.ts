import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemClock } from './clock';

describe('systemClock', () => {
  let originalTz: string | undefined;

  beforeEach(() => {
    originalTz = process.env.TZ;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('gives the local Australian date, not the UTC date', () => {
    process.env.TZ = 'Australia/Sydney';
    // 1:30 am on 22 November in Sydney (daylight time, UTC+11) is still 21 November in UTC.
    vi.setSystemTime(new Date('2026-11-21T14:30:00.000Z'));
    expect(systemClock.today()).toBe('2026-11-22');
    expect(systemClock.now()).toBe('2026-11-21T14:30:00.000Z');
  });

  it('follows the Mac time zone in Perth too', () => {
    process.env.TZ = 'Australia/Perth';
    // 10:30 pm on 21 November in Perth (UTC+8).
    vi.setSystemTime(new Date('2026-11-21T14:30:00.000Z'));
    expect(systemClock.today()).toBe('2026-11-21');
  });
});
