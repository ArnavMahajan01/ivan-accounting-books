import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';
import { createLogger } from '@shared/logger';
import { logFileSink, teeSinks } from './log-file';

function must<T>(r: { ok: true; value: T } | { ok: false }): T {
  if (!r.ok) throw new Error('fixture did not parse');
  return r.value;
}
const clock = fixedClock(
  must(parseCalendarDate('2026-11-22', 'YYYY-MM-DD')),
  must(parseTimestamp('2026-11-21T14:30:00.000Z')),
);

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'log-file-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('logFileSink', () => {
  it('appends one JSON line per record, with the time', () => {
    const log = createLogger('import', logFileSink({ dir, clock }));
    log.info('import.finished', { importId: 'imp_7f3', added: 42 });
    log.warn('import.row-rejected', { row: 3, code: 'not-an-amount' });
    const lines = readFileSync(join(dir, 'app.log'), 'utf8').trim().split('\n');
    expect(lines.map((l) => JSON.parse(l) as unknown)).toEqual([
      {
        time: '2026-11-21T14:30:00.000Z',
        level: 'info',
        scope: 'import',
        event: 'import.finished',
        fields: { importId: 'imp_7f3', added: 42 },
      },
      {
        time: '2026-11-21T14:30:00.000Z',
        level: 'warn',
        scope: 'import',
        event: 'import.row-rejected',
        fields: { row: 3, code: 'not-an-amount' },
      },
    ]);
  });

  it('creates the folder, and the file is readable only by the user', () => {
    const nested = join(dir, 'logs');
    createLogger('app', logFileSink({ dir: nested, clock })).info('app.started');
    expect(statSync(join(nested, 'app.log')).mode & 0o777).toBe(0o600);
  });

  it('rotates at the size limit and keeps only the given number of old files', () => {
    const log = createLogger('app', logFileSink({ dir, clock, maxBytes: 300, keptOldFiles: 3 }));
    for (let i = 0; i < 60; i += 1) log.info('app.tick', { count: i });
    expect(readdirSync(dir).sort()).toEqual(['app.1.log', 'app.2.log', 'app.3.log', 'app.log']);
    for (const file of readdirSync(dir)) {
      expect(statSync(join(dir, file)).size).toBeLessThanOrEqual(300);
    }
    // The newest line is in app.log, and the oldest kept file has older lines than app.1.log.
    const last = JSON.parse(
      readFileSync(join(dir, 'app.log'), 'utf8').trim().split('\n').at(-1) ?? '{}',
    ) as {
      fields: { count: number };
    };
    expect(last.fields.count).toBe(59);
    expect(existsSync(join(dir, 'app.4.log'))).toBe(false);
  });

  it('writes nothing when the logger refuses a private field', () => {
    const log = createLogger('app', logFileSink({ dir, clock }));
    expect(() => {
      log.info('x', { payeeName: 'Sample Supplies' });
    }).toThrow();
    expect(existsSync(join(dir, 'app.log'))).toBe(false);
  });
});

describe('teeSinks', () => {
  it('sends each record to every sink', () => {
    const a: string[] = [];
    const b: string[] = [];
    createLogger(
      'app',
      teeSinks(
        (r) => a.push(r.event),
        (r) => b.push(r.event),
      ),
    ).info('app.started');
    expect([a, b]).toEqual([['app.started'], ['app.started']]);
  });
});
