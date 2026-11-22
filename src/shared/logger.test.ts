import { describe, expect, it, vi } from 'vitest';
import { createLogger, PrivateLogFieldError, type LogRecord } from './logger';

function capture() {
  const records: LogRecord[] = [];
  return { records, logger: createLogger('import', (r) => records.push(r)) };
}

describe('createLogger', () => {
  it('writes ids, counts and codes', () => {
    const { records, logger } = capture();
    logger.info('import.finished', { importId: 'imp_7f3', added: 42, duplicates: 3 });
    logger.warn('import.row-rejected', { importId: 'imp_7f3', row: 12, code: 'not-an-amount' });
    logger.error('import.failed', { code: 'file-unreadable' });
    expect(records).toEqual([
      {
        level: 'info',
        scope: 'import',
        event: 'import.finished',
        fields: { importId: 'imp_7f3', added: 42, duplicates: 3 },
      },
      {
        level: 'warn',
        scope: 'import',
        event: 'import.row-rejected',
        fields: { importId: 'imp_7f3', row: 12, code: 'not-an-amount' },
      },
      {
        level: 'error',
        scope: 'import',
        event: 'import.failed',
        fields: { code: 'file-unreadable' },
      },
    ]);
  });

  it('throws on a field named description, and writes nothing', () => {
    const { records, logger } = capture();
    expect(() => {
      logger.info('x', { description: 'a' });
    }).toThrow(PrivateLogFieldError);
    expect(records).toHaveLength(0);
  });

  it.each(['description', 'amount', 'name', 'email', 'payee', 'token'])(
    'refuses the private field %s, in any case or inside a longer name',
    (word) => {
      const { logger } = capture();
      expect(() => {
        logger.info('x', { [word]: 1 });
      }).toThrow(PrivateLogFieldError);
      expect(() => {
        logger.info('x', { [`line${word.toUpperCase()}`]: 1 });
      }).toThrow(PrivateLogFieldError);
    },
  );

  it('refuses free text in a value, scope or event', () => {
    const { logger } = capture();
    expect(() => {
      logger.info('x', { code: 'EFTPOS PURCHASE CAFE' });
    }).toThrow(PrivateLogFieldError);
    expect(() => {
      logger.info('import finished', {});
    }).toThrow(PrivateLogFieldError);
    expect(() => {
      createLogger('two words').info('x');
    }).toThrow(PrivateLogFieldError);
    expect(() => {
      logger.info('x', { ratio: Number.NaN });
    }).toThrow(PrivateLogFieldError);
  });

  it('writes one JSON line to the console by default', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createLogger('app').info('app.started', { windows: 1 });
    createLogger('app').error('app.crashed', { code: 'boom' });
    expect(info).toHaveBeenCalledWith(
      '{"level":"info","scope":"app","event":"app.started","fields":{"windows":1}}',
    );
    expect(error).toHaveBeenCalledTimes(1);
    info.mockRestore();
    error.mockRestore();
  });
});
