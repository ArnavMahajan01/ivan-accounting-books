// The check for spec 106: signs in to the author's test Google Cloud project in the web browser,
// then lists the files the app can see in Drive. With the `drive.file` scope and nothing published
// yet, that list is empty, which proves the client id works and the scope is the narrow one.
// Needs MAIN_VITE_GOOGLE_CLIENT_ID in `.env`. Saves nothing: the sign-in is revoked at the end.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '@shared/env';
import { createConnection } from '@google/connection';
import { createHttpGoogle } from '@google/http-google';
import { openLoopback } from '@google/loopback';
import type { SavedSignIn, TokenStore } from '@google/token-store';
import { ok } from '@shared/result';

const env = loadEnv();
const clientId = env.ok ? env.value.MAIN_VITE_GOOGLE_CLIENT_ID : undefined;
if (clientId === undefined) {
  console.error('Put MAIN_VITE_GOOGLE_CLIENT_ID in .env first (see .env.example and spec 106).');
  process.exit(1);
}

let held: SavedSignIn | null = null;
const memory: TokenStore = {
  load: () => Promise.resolve(held),
  save: (s) => {
    held = s;
    return Promise.resolve(ok(undefined));
  },
  clear: () => {
    held = null;
  },
};
const fetchFn = (url: string, init?: RequestInit) => fetch(url, init);
const connection = createConnection({
  config: {
    clientId,
    clientSecret: env.ok ? (env.value.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? null) : null,
  },
  fetch: fetchFn,
  store: memory,
  random: { bytes: (n) => new Uint8Array(randomBytes(n)) },
  now: () => Date.now(),
  openBrowser: (url) => {
    spawn('open', [url], { stdio: 'ignore' });
    console.log('Sign in with the TEST Google account in the browser window that opened.');
    return Promise.resolve();
  },
  openLoopback,
  emailOf: async (token) => {
    const about = await createHttpGoogle(fetchFn, () => Promise.resolve(ok(token))).email();
    return about.ok ? about.value : null;
  },
});

const connected = await connection.connect();
if (!connected.ok) {
  console.error(`Sign-in did not work: ${connected.error}.`);
  process.exit(1);
}
console.log(
  `Signed in${connected.value.kind === 'connected' && connected.value.email !== null ? ` as ${connected.value.email}` : ''}.`,
);
const token = await connection.accessToken();
if (!token.ok) {
  console.error(`No access token: ${token.error}.`);
  process.exit(1);
}
const listed = await fetchFn('https://www.googleapis.com/drive/v3/files?fields=files(id,name)', {
  headers: { Authorization: `Bearer ${token.value}` },
});
const body: unknown = await listed.json();
console.log(
  `Drive answered ${String(listed.status)}. Files the app can see:`,
  JSON.stringify(body),
);
console.log(`Disconnect: ${await connection.disconnect()}.`);
