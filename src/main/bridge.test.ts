import { describe, expect, it } from 'vitest';
import { BRIDGE_NAMES, bridgeChannel } from '@shared/bridge-contract';
import { createLogger, type LogRecord } from '@shared/logger';
import { err, ok } from '@shared/result';
import { handleBridgeCall, registerBridge, type BridgeHandlers } from './bridge';
import { createTestDatabase } from '@data/test-database';
import { createHandlers } from './handlers';
import { staticBooks } from './test-books';
import { fixedClock, parseCalendarDate, parseTimestamp } from '@shared/dates';

const clock = (() => {
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  const now = parseTimestamp('2026-11-23T01:00:00.000Z');
  if (!today.ok || !now.ok) throw new Error('bad test date');
  return fixedClock(today.value, now.value);
})();

const appUrl = 'app://bundle/index.html';
const isAllowed = (url: string) => url === appUrl;

function setup(
  handlers: BridgeHandlers = createHandlers({
    app: { getVersion: () => '1.2.3', isPackaged: false },
    books: staticBooks(ok(createTestDatabase())),
    clock,
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
      books: staticBooks(ok(createTestDatabase())),
      clock,
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
      books: staticBooks(ok(createTestDatabase())),
      clock,
    });
    expect(await handlers['app.getInfo']({})).toEqual(ok({ version: '1.0.0', development: false }));
  });
});

describe('app.getDataStatus', () => {
  it('reports the schema version of open books, or the problem', async () => {
    const app = { getVersion: () => '1.0.0', isPackaged: true };
    expect(
      await createHandlers({ app, books: staticBooks(ok(createTestDatabase())), clock })[
        'app.getDataStatus'
      ]({}),
    ).toEqual(
      ok({ schemaVersion: createTestDatabase().schemaVersion, integrity: 'ok', problem: null }),
    );
    const failed = createHandlers({
      app,
      books: staticBooks(err({ code: 'applied-migration-changed', message: 'x' })),
      clock,
    });
    expect(await failed['app.getDataStatus']({})).toEqual(
      ok({ schemaVersion: null, integrity: null, problem: 'applied-migration-changed' }),
    );
  });
});

describe('books.getHealth', () => {
  const app = { getVersion: () => '1.0.0', isPackaged: true };

  it('reports sound books as having no problems', async () => {
    const handlers = createHandlers({ app, books: staticBooks(ok(createTestDatabase())), clock });
    expect(await handlers['books.getHealth']({})).toEqual(
      ok({ problems: [], entries: 0, lines: 0 }),
    );
  });

  it('reports books that did not open', async () => {
    const handlers = createHandlers({
      app,
      books: staticBooks(err({ code: 'integrity-failed', message: 'x' })),
      clock,
    });
    expect(await handlers['books.getHealth']({})).toEqual(
      ok({ problems: ['not-open'], entries: 0, lines: 0 }),
    );
  });

  it('reports books that do not balance', async () => {
    const store = createTestDatabase();
    store.db.exec(`
      INSERT INTO account (id, code, name, type, created_at, updated_at) VALUES ('acc_a', '1', 'A', 'asset', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO journal_entry (id, entry_date, source_kind, created_at, updated_at) VALUES ('ent_a', '2026-08-01', 'manual', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO journal_line (id, entry_id, position, account_id, amount_cents) VALUES ('lin_a', 'ent_a', 0, 'acc_a', 100);
    `);
    const handlers = createHandlers({ app, books: staticBooks(ok(store)), clock });
    expect(await handlers['books.getHealth']({})).toEqual(
      ok({ problems: ['out-of-balance'], entries: 1, lines: 1 }),
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
        books: staticBooks(ok(createTestDatabase())),
        clock,
      }),
      isAllowed,
      createLogger('bridge', () => undefined),
    );
    expect(channels).toEqual(BRIDGE_NAMES.map(bridgeChannel));
  });
});

describe('the books screens', () => {
  const handlers = async () => {
    const store = createTestDatabase();
    const { buildSampleBooks } = await import('@services/sample/build-sample-books');
    buildSampleBooks(
      { db: store.db },
      parseCalendarDate('2026-11-23', 'YYYY-MM-DD').ok ? clock.today() : clock.today(),
    );
    return createHandlers({
      app: { getVersion: () => '1.0.0', isPackaged: true },
      books: staticBooks(ok(store)),
      clock,
    });
  };

  it('home.getSummary, accounts.list and transactions.list answer from the books', async () => {
    const h = await handlers();
    const home = await h['home.getSummary']({});
    expect(home).toMatchObject({
      ok: true,
      value: { brandNew: false, bank: { balance: 4364235 } },
    });
    const accounts = await h['accounts.list']({});
    expect(accounts.ok && accounts.value.accounts).toHaveLength(39);
    const list = await h['transactions.list']({ kind: 'transfers' });
    expect(list.ok && list.value.matching).toBe(3);
  });

  it('transactions.get finds an entry, and is null for one that is not there', async () => {
    const h = await handlers();
    const list = await h['transactions.list']({ limit: 1 });
    const id = list.ok ? (list.value.rows[0]?.id ?? '') : '';
    const detail = await h['transactions.get']({ id });
    expect(detail.ok && detail.value?.id).toBe(id);
    expect(await h['transactions.get']({ id: 'ent_nothere' })).toEqual(ok(null));
  });

  it('transactions.list refuses a date that does not exist, as invalid input', async () => {
    const h = await handlers();
    expect(await h['transactions.list']({ from: '2026-02-31' })).toEqual({
      ok: false,
      error: { code: 'invalid-input' },
    });
  });

  it('answers an error, not a crash, when the books did not open', async () => {
    const h = createHandlers({
      app: { getVersion: () => '1.0.0', isPackaged: true },
      books: staticBooks(err({ code: 'integrity-failed', message: 'x' })),
      clock,
    });
    expect(await h['home.getSummary']({})).toEqual({ ok: false, error: { code: 'internal' } });
    expect(await h['accounts.list']({})).toEqual({ ok: false, error: { code: 'internal' } });
  });

  it('turns a refused sample change into the right error', async () => {
    const h = createHandlers({
      app: { getVersion: () => '1.0.0', isPackaged: true },
      books: {
        ...staticBooks(ok(createTestDatabase())),
        loadSample: () => err('switch-off'),
        clearSample: () => err('not-loaded'),
      },
      clock,
    });
    expect(await h['sample.load']({})).toEqual({ ok: false, error: { code: 'not-allowed' } });
    expect(await h['sample.clear']({})).toEqual({ ok: false, error: { code: 'internal' } });
    expect(await h['app.getBooksState']({})).toMatchObject({ ok: true, value: { mode: 'real' } });
  });
});

describe('the contract’s input checks', () => {
  const run = (name: Parameters<typeof handleBridgeCall>[0], input: unknown) =>
    handleBridgeCall(
      name,
      { senderUrl: appUrl, input },
      createHandlers({
        app: { getVersion: () => '1', isPackaged: true },
        books: staticBooks(ok(createTestDatabase())),
        clock,
      }),
      isAllowed,
      createLogger('bridge', () => undefined),
    );

  it.each([
    [{ limit: 0 }],
    [{ limit: 201 }],
    [{ offset: -1 }],
    [{ kind: 'everything' }],
    [{ from: '1/7/2026' }],
    [{ accountId: 'bad id' }],
    [{ search: 'x'.repeat(101) }],
    [{ extra: true }],
  ])('transactions.list refuses %j', async (input) => {
    expect(await run('transactions.list', input)).toEqual({
      ok: false,
      error: { code: 'invalid-input' },
    });
  });

  it('transactions.get needs an entry id', async () => {
    expect(await run('transactions.get', {})).toEqual({
      ok: false,
      error: { code: 'invalid-input' },
    });
    expect(await run('transactions.get', { id: 'acc_x' })).toEqual({
      ok: false,
      error: { code: 'invalid-input' },
    });
  });
});
