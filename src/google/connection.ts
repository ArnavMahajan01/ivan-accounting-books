// The Google connection (specs 107, 108): connect once in the system browser, stay connected
// across restarts through the saved refresh token, hand out short-lived access tokens to the
// Sheets and Drive calls, and disconnect cleanly. Access tokens live in memory only.

import type { RandomSource } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import type { GoogleStatus } from '@shared/sheets';
import type { Loopback } from './loopback';
import {
  authUrl,
  exchangeCode,
  newState,
  pkcePair,
  readCallback,
  refreshAccess,
  revokeToken,
  type Fetch,
  type GoogleClientConfig,
  type GoogleFailure,
  type SignInFailure,
} from './oauth';
import type { SavedSignIn, TokenStore } from './token-store';

/** He has this long to finish signing in in the browser. */
export const SIGN_IN_WAIT_MS = 5 * 60 * 1000;

export type ConnectFailure =
  SignInFailure | 'not-set-up' | 'cancelled' | 'no-keychain' | 'no-port' | 'busy';

export type DisconnectOutcome =
  /** Revoked at Google and deleted here. */
  | 'disconnected'
  /** Deleted here, but Google could not be reached to take the access back. */
  | 'not-revoked';

export interface GoogleConnection {
  status(): Promise<GoogleStatus>;
  connect(): Promise<Result<GoogleStatus, ConnectFailure>>;
  disconnect(): Promise<DisconnectOutcome>;
  /** A current access token, refreshed when it is about to run out. */
  accessToken(): Promise<Result<string, GoogleFailure>>;
}

export interface ConnectionDeps {
  /** Null when the app was built without a Google client id: "not set up" (spec 106). */
  readonly config: GoogleClientConfig | null;
  readonly fetch: Fetch;
  readonly store: TokenStore;
  readonly random: RandomSource;
  /** Milliseconds since 1970, for the access token's expiry. */
  readonly now: () => number;
  /** Opens the sign-in page in his normal browser. */
  readonly openBrowser: (url: string) => Promise<void>;
  readonly openLoopback: () => Promise<Result<Loopback, 'no-port'>>;
  /** The signed-in account's email, for "Connected as …". Null when Google did not say. */
  readonly emailOf: (accessToken: string) => Promise<string | null>;
  /** Told when the status changes, so the screens can show or hide the banner. */
  readonly onStatus?: (status: GoogleStatus) => void;
  readonly signInWaitMs?: number;
}

/** A token this close to running out is refreshed first. */
const EXPIRY_MARGIN_MS = 60_000;

export function createConnection(deps: ConnectionDeps): GoogleConnection {
  let saved: SavedSignIn | null = null;
  // The saved sign-in is read once, before anything else is answered.
  const loaded =
    deps.config === null
      ? Promise.resolve()
      : deps.store.load().then((s) => {
          saved = s;
        });
  let needsSignIn = false;
  let access: { token: string; expiresAt: number } | null = null;
  let connecting = false;

  const statusNow = (): GoogleStatus => {
    if (deps.config === null) return { kind: 'not-set-up' };
    if (saved === null) return { kind: 'not-connected' };
    return needsSignIn
      ? { kind: 'needs-sign-in', email: saved.email }
      : { kind: 'connected', email: saved.email };
  };
  const changed = () => deps.onStatus?.(statusNow());

  return {
    async status() {
      await loaded;
      return statusNow();
    },

    async connect() {
      const config = deps.config;
      if (config === null) return err('not-set-up');
      if (connecting) return err('busy');
      connecting = true;
      await loaded;
      try {
        const loopback = await deps.openLoopback();
        if (!loopback.ok) return loopback;
        const { verifier, challenge } = pkcePair(deps.random);
        const state = newState(deps.random);
        await deps.openBrowser(authUrl(config, loopback.value.redirectUri, challenge, state));
        const back = await loopback.value.waitForCallback(deps.signInWaitMs ?? SIGN_IN_WAIT_MS);
        if (!back.ok) return err('cancelled');
        const code = readCallback(back.value, state);
        if (!code.ok) return err(code.error === 'denied' ? 'cancelled' : 'failed');
        const signedIn = await exchangeCode(
          deps.fetch,
          config,
          code.value,
          verifier,
          loopback.value.redirectUri,
        );
        if (!signedIn.ok) return signedIn;
        const email = await deps.emailOf(signedIn.value.accessToken);
        const kept = await deps.store.save({ refreshToken: signedIn.value.refreshToken, email });
        if (!kept.ok) return kept;
        saved = { refreshToken: signedIn.value.refreshToken, email };
        needsSignIn = false;
        access = {
          token: signedIn.value.accessToken,
          expiresAt: deps.now() + signedIn.value.expiresIn * 1000,
        };
        changed();
        return ok(statusNow());
      } finally {
        connecting = false;
      }
    },

    async disconnect() {
      await loaded;
      const token = saved?.refreshToken ?? null;
      deps.store.clear();
      saved = null;
      access = null;
      needsSignIn = false;
      changed();
      if (token === null) return 'disconnected';
      const revoked = await revokeToken(deps.fetch, token);
      return revoked.ok ? 'disconnected' : 'not-revoked';
    },

    async accessToken() {
      await loaded;
      const config = deps.config;
      if (config === null || saved === null || needsSignIn) return err('needs-sign-in');
      if (access !== null && access.expiresAt - EXPIRY_MARGIN_MS > deps.now()) {
        return ok(access.token);
      }
      const fresh = await refreshAccess(deps.fetch, config, saved.refreshToken);
      if (!fresh.ok) {
        if (fresh.error === 'needs-sign-in') {
          needsSignIn = true;
          access = null;
          changed();
        }
        return fresh;
      }
      access = {
        token: fresh.value.accessToken,
        expiresAt: deps.now() + fresh.value.expiresIn * 1000,
      };
      return ok(access.token);
    },
  };
}
