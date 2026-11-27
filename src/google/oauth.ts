// Signing in to Google from a desktop app (spec 107): the system browser, PKCE with S256, a random
// state, and a loopback redirect on 127.0.0.1. Read from Google's "OAuth 2.0 for iOS & Desktop
// Apps" page on 2026-11-27 (.claude/skills/google-sheets-drive). A desktop client is a public
// client: the client secret, when there is one, is optional and not private, and PKCE protects the
// code. Every response from Google is outside input, so it is checked with Zod.

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { RandomSource } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

export interface GoogleClientConfig {
  readonly clientId: string;
  readonly clientSecret: string | null;
}

/** The `fetch` the app uses: Node's own, or a fake in tests. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Why a call to Google did not work, in the words the screens use. */
export type GoogleFailure =
  /** Google could not be reached. The action waits. */
  | 'offline'
  /** The sign-in expired or was taken back: "Google needs you to sign in again". */
  | 'needs-sign-in'
  /** The file is gone, or the app may no longer open it. */
  | 'not-found'
  /** Anything else Google refused. */
  | 'failed';

/** Bytes as base64url with no padding, as PKCE and the state need. */
export function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/** A PKCE verifier (43 characters from 32 random bytes) and its S256 challenge. */
export function pkcePair(random: RandomSource): { verifier: string; challenge: string } {
  const verifier = base64Url(random.bytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function newState(random: RandomSource): string {
  return base64Url(random.bytes(24));
}

/** The address the browser opens to sign in. */
export function authUrl(
  config: GoogleClientConfig,
  redirectUri: string,
  challenge: string,
  state: string,
): string {
  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  return url.toString();
}

export type CallbackProblem = 'denied' | 'bad-state' | 'no-code';

/** The code Google sent back to the loopback address, once the state matches ours. */
export function readCallback(url: URL, expectedState: string): Result<string, CallbackProblem> {
  if (url.searchParams.get('state') !== expectedState) return err('bad-state');
  if (url.searchParams.has('error')) return err('denied');
  const code = url.searchParams.get('code');
  return code === null || code === '' ? err('no-code') : ok(code);
}

const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});

export interface AccessToken {
  readonly accessToken: string;
  /** Seconds it lasts from now. */
  readonly expiresIn: number;
}

export interface SignedIn extends AccessToken {
  readonly refreshToken: string;
}

/** A call that could not reach Google is "offline"; anything else that failed is "failed". */
async function post(
  fetchFn: Fetch,
  url: string,
  body: Record<string, string>,
): Promise<Result<Response, 'offline'>> {
  try {
    return ok(
      await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
      }),
    );
  } catch {
    return err('offline');
  }
}

function clientFields(config: GoogleClientConfig): Record<string, string> {
  return config.clientSecret === null
    ? { client_id: config.clientId }
    : { client_id: config.clientId, client_secret: config.clientSecret };
}

/** Whether Google's answer granted the one scope the app needs. He can untick it on Google's page. */
function grantedDriveFile(scope: string | undefined): boolean {
  return scope === undefined || scope.split(' ').includes(GOOGLE_SCOPE);
}

export type SignInFailure = GoogleFailure | 'scope-refused';

/** Swaps the code from the loopback for the tokens. */
export async function exchangeCode(
  fetchFn: Fetch,
  config: GoogleClientConfig,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<Result<SignedIn, SignInFailure>> {
  const response = await post(fetchFn, TOKEN_ENDPOINT, {
    ...clientFields(config),
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (!response.ok) return response;
  if (!response.value.ok) return err('failed');
  const parsed = tokenResponse.safeParse(await response.value.json().catch(() => null));
  if (!parsed.success || parsed.data.refresh_token === undefined) return err('failed');
  if (!grantedDriveFile(parsed.data.scope)) return err('scope-refused');
  return ok({
    accessToken: parsed.data.access_token,
    expiresIn: parsed.data.expires_in,
    refreshToken: parsed.data.refresh_token,
  });
}

/** A new access token from the saved refresh token. `invalid_grant` means sign in again. */
export async function refreshAccess(
  fetchFn: Fetch,
  config: GoogleClientConfig,
  refreshToken: string,
): Promise<Result<AccessToken, GoogleFailure>> {
  const response = await post(fetchFn, TOKEN_ENDPOINT, {
    ...clientFields(config),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  if (!response.ok) return response;
  const body: unknown = await response.value.json().catch(() => null);
  if (!response.value.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    return err(error.success && error.data.error === 'invalid_grant' ? 'needs-sign-in' : 'failed');
  }
  const parsed = tokenResponse.safeParse(body);
  if (!parsed.success) return err('failed');
  return ok({ accessToken: parsed.data.access_token, expiresIn: parsed.data.expires_in });
}

/** Takes the access back at Google. Revoking the refresh token ends every token it made. */
export async function revokeToken(
  fetchFn: Fetch,
  token: string,
): Promise<Result<void, 'offline' | 'failed'>> {
  const response = await post(fetchFn, REVOKE_ENDPOINT, { token });
  if (!response.ok) return response;
  // A token Google no longer knows (already revoked or expired) is gone either way.
  return response.value.ok || response.value.status === 400 ? ok(undefined) : err('failed');
}
