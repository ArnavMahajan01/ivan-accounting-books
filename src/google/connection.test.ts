import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { seededRandom } from '@shared/ids';
import { ok } from '@shared/result';
import { createConnection, type ConnectionDeps } from './connection';
import { CALLBACK_PATH, openLoopback, type Loopback } from './loopback';
import type { Fetch } from './oauth';
import { fileTokenStore, type TokenCipher } from './token-store';

// A cipher that changes the bytes, so a test can tell the file holds no plain text.
const cipher: TokenCipher = {
  isAvailable: () => Promise.resolve(true),
  encrypt: (text) => Promise.resolve(Buffer.from(text, 'utf8').reverse()),
  decrypt: (data) =>
    Promise.resolve({ text: Buffer.from(data).reverse().toString('utf8'), reEncrypt: false }),
};

const dirs: string[] = [];
function tokenPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'accounting-books-google-'));
  dirs.push(dir);
  return join(dir, 'google-sign-in.bin');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Google's token endpoint, faked: the code gives tokens, the refresh token gives an access token. */
function fakeGoogle(
  refreshAnswer: () => Response = () => json(200, { access_token: 'at2', expires_in: 3600 }),
) {
  const urls: string[] = [];
  const fetchFn: Fetch = (url, init) => {
    urls.push(url);
    const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '');
    if (url.endsWith('/revoke')) return Promise.resolve(new Response('', { status: 200 }));
    if (form.get('grant_type') === 'authorization_code') {
      return Promise.resolve(
        json(200, { access_token: 'at1', expires_in: 3600, refresh_token: 'rt1' }),
      );
    }
    return Promise.resolve(refreshAnswer());
  };
  return { fetchFn, urls };
}

/** A loopback that "comes back" with whatever the browser was sent, plus the code. */
function answeringLoopback(opened: string[], answer: (state: string) => string) {
  const loopback: Loopback = {
    redirectUri: 'http://127.0.0.1:5000/signed-in',
    close: () => undefined,
    waitForCallback: () => {
      const state = new URL(opened[0] ?? '').searchParams.get('state') ?? '';
      return Promise.resolve(ok(new URL(`http://127.0.0.1:5000/signed-in?${answer(state)}`)));
    },
  };
  return () => Promise.resolve(ok(loopback));
}

function deps(path: string, extra: Partial<ConnectionDeps> = {}): ConnectionDeps {
  const opened: string[] = [];
  let now = 1_000_000;
  return {
    config: { clientId: 'test-client.apps.googleusercontent.com', clientSecret: null },
    fetch: fakeGoogle().fetchFn,
    store: fileTokenStore(path, cipher),
    random: seededRandom(7),
    now: () => (now += 1000),
    openBrowser: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    openLoopback: answeringLoopback(opened, (state) => `state=${state}&code=good`),
    emailOf: () => Promise.resolve('owner@example.com'),
    ...extra,
  };
}

describe('connecting Google (spec 107)', () => {
  it('connects, and is still connected after a restart, with the token encrypted on disk', async () => {
    const path = tokenPath();
    const first = createConnection(deps(path));
    expect(await first.status()).toEqual({ kind: 'not-connected' });
    expect(await first.connect()).toEqual({
      ok: true,
      value: { kind: 'connected', email: 'owner@example.com' },
    });
    const onDisk = readFileSync(path).toString('utf8');
    expect(onDisk).not.toContain('rt1');
    expect(onDisk).not.toContain('owner@example.com');

    const restarted = createConnection(deps(path));
    expect(await restarted.status()).toEqual({ kind: 'connected', email: 'owner@example.com' });
    expect(await restarted.accessToken()).toEqual({ ok: true, value: 'at2' });
  });

  it('is "not set up" without a client id, and never opens the browser', async () => {
    const opened: string[] = [];
    const c = createConnection(
      deps(tokenPath(), {
        config: null,
        openBrowser: (url) => {
          opened.push(url);
          return Promise.resolve();
        },
      }),
    );
    expect(await c.status()).toEqual({ kind: 'not-set-up' });
    expect(await c.connect()).toEqual({ ok: false, error: 'not-set-up' });
    expect(opened).toEqual([]);
  });

  it('refuses an answer whose state is not ours', async () => {
    const opened: string[] = [];
    const c = createConnection(
      deps(tokenPath(), {
        openBrowser: (url) => {
          opened.push(url);
          return Promise.resolve();
        },
        openLoopback: answeringLoopback(opened, () => 'state=forged&code=evil'),
      }),
    );
    expect(await c.connect()).toEqual({ ok: false, error: 'failed' });
    expect(await c.status()).toEqual({ kind: 'not-connected' });
  });

  it('says "sign in again" when Google answers invalid_grant, and tells the screens', async () => {
    const path = tokenPath();
    await createConnection(deps(path)).connect();
    const told: string[] = [];
    const c = createConnection(
      deps(path, {
        fetch: fakeGoogle(() => json(400, { error: 'invalid_grant' })).fetchFn,
        onStatus: (s) => told.push(s.kind),
      }),
    );
    expect(await c.accessToken()).toEqual({ ok: false, error: 'needs-sign-in' });
    expect(await c.status()).toEqual({ kind: 'needs-sign-in', email: 'owner@example.com' });
    expect(told).toEqual(['needs-sign-in']);
  });

  it('keeps an access token until it is about to run out', async () => {
    const google = fakeGoogle();
    const c = createConnection(deps(tokenPath(), { fetch: google.fetchFn }));
    await c.connect();
    expect(await c.accessToken()).toEqual({ ok: true, value: 'at1' });
    expect(google.urls.filter((u) => u.includes('token'))).toHaveLength(1);
  });
});

describe('disconnecting (spec 108)', () => {
  it('revokes at Google and deletes the file', async () => {
    const path = tokenPath();
    const google = fakeGoogle();
    const c = createConnection(deps(path, { fetch: google.fetchFn }));
    await c.connect();
    expect(await c.disconnect()).toBe('disconnected');
    expect(google.urls.at(-1)).toBe('https://oauth2.googleapis.com/revoke');
    expect(await createConnection(deps(path)).status()).toEqual({ kind: 'not-connected' });
  });

  it('still forgets the sign-in here when Google cannot be reached, and says so', async () => {
    const path = tokenPath();
    await createConnection(deps(path)).connect();
    const offline: Fetch = () => Promise.reject(new TypeError('fetch failed'));
    const c = createConnection(deps(path, { fetch: offline }));
    expect(await c.disconnect()).toBe('not-revoked');
    expect(await c.status()).toEqual({ kind: 'not-connected' });
  });
});

describe('the loopback address', () => {
  it('listens on 127.0.0.1, takes the sign-in answer once, and closes', async () => {
    const opened = await openLoopback();
    if (!opened.ok) throw new Error('no port');
    const loopback = opened.value;
    expect(loopback.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/signed-in$/);
    const port = new URL(loopback.redirectUri).port;
    const other = await fetch(`http://127.0.0.1:${port}/elsewhere`);
    expect(other.status).toBe(404);
    const waiting = loopback.waitForCallback(5000);
    const page = await fetch(`http://127.0.0.1:${port}${CALLBACK_PATH}?state=s&code=c`);
    expect(await page.text()).toContain('You can close this tab');
    const back = await waiting;
    expect(back.ok && back.value.searchParams.get('code')).toBe('c');
    await expect(fetch(`http://127.0.0.1:${port}${CALLBACK_PATH}`)).rejects.toThrow();
  });

  it('gives up after the wait', async () => {
    const opened = await openLoopback();
    if (!opened.ok) throw new Error('no port');
    expect(await opened.value.waitForCallback(20)).toEqual({ ok: false, error: 'timeout' });
  });
});
