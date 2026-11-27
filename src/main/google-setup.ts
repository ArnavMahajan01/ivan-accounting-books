// Puts the Google connection together for the main process (specs 106 to 108): the client id from
// the build, the Keychain through safeStorage, the system browser, and the loopback address. An
// unpackaged build started with GOOGLE_FAKE=1 gets the in-memory Google instead, so the screens
// can be built without a Google account. The packaged app never does.

import { safeStorage, shell } from 'electron';
import { join } from 'node:path';
import type { RandomSource } from '@shared/ids';
import type { Logger } from '@shared/logger';
import type { Env } from '@shared/env';
import type { GoogleStatus } from '@shared/sheets';
import { createConnection, type GoogleConnection } from '@google/connection';
import { createFakeGoogle, type FakeGoogle } from '@google/fake-google';
import type { GoogleApi } from '@google/google-api';
import { createHttpGoogle } from '@google/http-google';
import { openLoopback } from '@google/loopback';
import { fileTokenStore } from '@google/token-store';

export interface GoogleAccess {
  readonly connection: GoogleConnection;
  readonly api: GoogleApi;
  /** The in-memory Google, in development only. */
  readonly fake: FakeGoogle | null;
  /** Opens an https address in his normal browser. Anything else is refused. */
  openInBrowser(url: string): Promise<boolean>;
}

export const TOKEN_FILE = 'google-sign-in.bin';

export async function openHttps(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  await shell.openExternal(parsed.toString());
  return true;
}

export function createGoogleAccess(options: {
  readonly dataDir: string;
  readonly packaged: boolean;
  readonly env: Env;
  readonly random: RandomSource;
  readonly now: () => string;
  readonly log: Logger;
  readonly onStatus: (status: GoogleStatus) => void;
}): GoogleAccess {
  if (!options.packaged && options.env.GOOGLE_FAKE === '1') {
    options.log.info('google.fake');
    const fake = createFakeGoogle({
      path: join(options.dataDir, 'fake-google.json'),
      now: options.now,
      onStatus: options.onStatus,
    });
    return { connection: fake.connection, api: fake.api, fake, openInBrowser: openHttps };
  }
  const clientId = options.env.MAIN_VITE_GOOGLE_CLIENT_ID;
  const config =
    clientId === undefined
      ? null
      : { clientId, clientSecret: options.env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? null };
  const fetchFn = (url: string, init?: RequestInit) => fetch(url, init);
  const connection = createConnection({
    config,
    fetch: fetchFn,
    store: fileTokenStore(join(options.dataDir, TOKEN_FILE), {
      isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
      encrypt: (text) => safeStorage.encryptStringAsync(text),
      decrypt: async (data) => {
        const opened = await safeStorage.decryptStringAsync(data);
        return { text: opened.result, reEncrypt: opened.shouldReEncrypt };
      },
    }),
    random: options.random,
    now: () => Date.now(),
    openBrowser: async (url) => {
      await openHttps(url);
    },
    openLoopback,
    emailOf: async (accessToken) => {
      const about = await createHttpGoogle(fetchFn, () =>
        Promise.resolve({ ok: true, value: accessToken }),
      ).email();
      return about.ok ? about.value : null;
    },
    onStatus: options.onStatus,
  });
  const api = createHttpGoogle(fetchFn, () => connection.accessToken());
  return { connection, api, fake: null, openInBrowser: openHttps };
}
