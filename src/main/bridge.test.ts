import { describe, expect, it } from 'vitest';
import { BRIDGE_NAMES, bridgeChannel } from '@shared/bridge-contract';
import { createLogger, type LogRecord } from '@shared/logger';
import { err, ok } from '@shared/result';
import { handleBridgeCall, registerBridge, type BridgeHandlers } from './bridge';
import { createTestDatabase } from '@data/test-database';
import { createHandlers } from './handlers';

const appUrl = 'app://bundle/index.html';
const isAllowed = (url: string) => url === appUrl;

function setup(
  handlers: BridgeHandlers = createHandlers({
    app: { getVersion: () => '1.2.3', isPackaged: false },
    store: ok(createTestDatabase()),
  }),
) {
  const records: LogRecord[] = [];
  const log = createLogger('bridge', (r) => {
    records.push(r);
  });
  const call = (input: unknown, senderUrl: string | null = appUrl) =>
    handleBridgeCall('app.getInfo', { senderUrl, input }, handlers, isAllowed, log);
  return { records, call };
}

describe('handleBridgeCall', () => {
  it('runs the handler for valid input from the app page', async () => {
    const { records, call } = setup();
    expect(await call({})).toEqual(ok({ version: '1.2.3', development: true }));
    expect(records).toEqual([]);
  });

  it.each([[{ extra: 1 }], ['x'], [null], [undefined], [[]], [42]])(
    'refuses wrong input %j, logging only the event and the code',
    async (input) => {
      const { records, call } = setup();
      expect(await call(input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
      expect(records).toEqual([
        {
          level: 'warn',
          scope: 'bridge',
          event: 'bridge.refused',
          fields: { bridgeFunction: 'app.getInfo', code: 'invalid-input' },
        },
      ]);
    },
  );

  it('refuses a call from any other page, before reading the input', async () => {
    const { records, call } = setup();
    expect(await call({}, 'https://example.com/')).toEqual({
      ok: false,
      error: { code: 'not-allowed' },
    });
    expect(await call({}, null)).toEqual({ ok: false, error: { code: 'not-allowed' } });
    expect(records.map((r) => r.fields.code)).toEqual(['not-allowed', 'not-allowed']);
  });

  it('turns a handler that throws into an internal error, without its message', async () => {
    const working = createHandlers({
      app: { getVersion: () => '1.0.0', isPackaged: true },
      store: ok(createTestDatabase()),
    });
    const { records, call } = setup({
      ...working,
      'app.getInfo': () => {
        throw new Error('private detail');
      },
    });
    const result = await call({});
    expect(result).toEqual({ ok: false, error: { code: 'internal' } });
    expect(JSON.stringify(records)).not.toContain('private detail');
    expect(records[0]?.event).toBe('bridge.failed');
  });
});

describe('createHandlers', () => {
  it('reports a packaged app as not development', async () => {
    const handlers = createHandlers({
      app: { getVersion: () => '1.0.0', isPackaged: true },
      store: ok(createTestDatabase()),
    });
    expect(await handlers['app.getInfo']({})).toEqual(ok({ version: '1.0.0', development: false }));
  });
});

describe('app.getDataStatus', () => {
  it('reports the schema version of open books, or the problem', async () => {
    const app = { getVersion: () => '1.0.0', isPackaged: true };
    expect(
      await createHandlers({ app, store: ok(createTestDatabase()) })['app.getDataStatus']({}),
    ).toEqual(ok({ schemaVersion: 1, integrity: 'ok', problem: null }));
    const failed = createHandlers({
      app,
      store: err({ code: 'applied-migration-changed', message: 'x' }),
    });
    expect(await failed['app.getDataStatus']({})).toEqual(
      ok({ schemaVersion: null, integrity: null, problem: 'applied-migration-changed' }),
    );
  });
});

describe('registerBridge', () => {
  it('registers one channel per contract function, and nothing else', () => {
    const channels: string[] = [];
    registerBridge(
      {
        handle: (channel) => {
          channels.push(channel);
        },
      },
      createHandlers({
        app: { getVersion: () => '1.0.0', isPackaged: true },
        store: ok(createTestDatabase()),
      }),
      isAllowed,
      createLogger('bridge', () => undefined),
    );
    expect(channels).toEqual(BRIDGE_NAMES.map(bridgeChannel));
  });
});
