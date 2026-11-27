import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { seededRandom } from '@shared/ids';
import {
  authUrl,
  exchangeCode,
  GOOGLE_SCOPE,
  pkcePair,
  readCallback,
  refreshAccess,
  revokeToken,
  TOKEN_ENDPOINT,
  type Fetch,
} from './oauth';

const CONFIG = { clientId: 'test-client.apps.googleusercontent.com', clientSecret: null };

/** A fake fetch that answers with `reply` and keeps every request. */
function fakeFetch(reply: () => Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchFn: Fetch = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(reply());
  };
  return { fetchFn, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const formOf = (init: RequestInit | undefined) =>
  new URLSearchParams(typeof init?.body === 'string' ? init.body : '');

describe('PKCE and the sign-in address', () => {
  it('makes a 43-character verifier and its S256 challenge', () => {
    const { verifier, challenge } = pkcePair(seededRandom(1));
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('asks for drive.file only, with PKCE, the state and the loopback address', () => {
    const url = new URL(authUrl(CONFIG, 'http://127.0.0.1:5000/signed-in', 'chal', 'st'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CONFIG.clientId,
      redirect_uri: 'http://127.0.0.1:5000/signed-in',
      response_type: 'code',
      scope: GOOGLE_SCOPE,
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      state: 'st',
    });
  });
});

describe('the answer at the loopback address', () => {
  const at = (query: string) => new URL(`http://127.0.0.1:5000/signed-in?${query}`);
  it('gives the code when the state matches', () => {
    expect(readCallback(at('state=st&code=abc'), 'st')).toEqual({ ok: true, value: 'abc' });
  });
  it('refuses a different state, so another page cannot finish his sign-in', () => {
    expect(readCallback(at('state=other&code=abc'), 'st')).toEqual({
      ok: false,
      error: 'bad-state',
    });
  });
  it('says he said no', () => {
    expect(readCallback(at('state=st&error=access_denied'), 'st')).toEqual({
      ok: false,
      error: 'denied',
    });
  });
});

describe('exchanging the code', () => {
  it('posts the code and verifier, and keeps the refresh token', async () => {
    const { fetchFn, calls } = fakeFetch(() =>
      json(200, {
        access_token: 'at',
        expires_in: 3599,
        refresh_token: 'rt',
        scope: GOOGLE_SCOPE,
        token_type: 'Bearer',
      }),
    );
    const r = await exchangeCode(
      fetchFn,
      CONFIG,
      'code1',
      'ver1',
      'http://127.0.0.1:5000/signed-in',
    );
    expect(r).toEqual({
      ok: true,
      value: { accessToken: 'at', expiresIn: 3599, refreshToken: 'rt' },
    });
    expect(calls[0]?.url).toBe(TOKEN_ENDPOINT);
    expect(Object.fromEntries(formOf(calls[0]?.init))).toEqual({
      client_id: CONFIG.clientId,
      code: 'code1',
      code_verifier: 'ver1',
      grant_type: 'authorization_code',
      redirect_uri: 'http://127.0.0.1:5000/signed-in',
    });
  });

  it('sends the client secret only when there is one', async () => {
    const { fetchFn, calls } = fakeFetch(() =>
      json(200, { access_token: 'at', expires_in: 10, refresh_token: 'rt' }),
    );
    await exchangeCode(fetchFn, { ...CONFIG, clientSecret: 'shh-not-private' }, 'c', 'v', 'r');
    expect(formOf(calls[0]?.init).get('client_secret')).toBe('shh-not-private');
  });

  it('refuses a sign-in where he unticked access to the app’s files', async () => {
    const { fetchFn } = fakeFetch(() =>
      json(200, { access_token: 'at', expires_in: 10, refresh_token: 'rt', scope: 'openid' }),
    );
    expect(await exchangeCode(fetchFn, CONFIG, 'c', 'v', 'r')).toEqual({
      ok: false,
      error: 'scope-refused',
    });
  });

  it('is offline when Google cannot be reached', async () => {
    const fetchFn: Fetch = () => Promise.reject(new TypeError('fetch failed'));
    expect(await exchangeCode(fetchFn, CONFIG, 'c', 'v', 'r')).toEqual({
      ok: false,
      error: 'offline',
    });
  });
});

describe('refreshing and revoking', () => {
  it('invalid_grant means sign in again', async () => {
    const { fetchFn } = fakeFetch(() => json(400, { error: 'invalid_grant' }));
    expect(await refreshAccess(fetchFn, CONFIG, 'rt')).toEqual({
      ok: false,
      error: 'needs-sign-in',
    });
  });

  it('gives a fresh access token', async () => {
    const { fetchFn, calls } = fakeFetch(() =>
      json(200, { access_token: 'at2', expires_in: 3599 }),
    );
    expect(await refreshAccess(fetchFn, CONFIG, 'rt')).toEqual({
      ok: true,
      value: { accessToken: 'at2', expiresIn: 3599 },
    });
    expect(formOf(calls[0]?.init).get('grant_type')).toBe('refresh_token');
  });

  it('revokes at Google, and a token Google no longer knows counts as gone', async () => {
    const good = fakeFetch(() => new Response('', { status: 200 }));
    expect(await revokeToken(good.fetchFn, 'rt')).toEqual({ ok: true, value: undefined });
    expect(good.calls[0]?.url).toBe('https://oauth2.googleapis.com/revoke');
    expect(formOf(good.calls[0]?.init).get('token')).toBe('rt');
    const unknown = fakeFetch(() => json(400, { error: 'invalid_token' }));
    expect((await revokeToken(unknown.fetchFn, 'rt')).ok).toBe(true);
  });
});
