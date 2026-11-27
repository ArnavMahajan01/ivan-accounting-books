# 107: Connect a Google Account

Spec: [107](../feature-specs/09-demo-7-google-sheets/107-connect-google.md)
Status: Implemented, check deferred (needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `src/google/oauth.ts`: PKCE (S256, 43-character verifier), a random state, the sign-in address with scope `drive.file` only, reading the loopback answer (refuses a state that is not ours), swapping the code for tokens (refuses a sign-in where he unticked access to the app's files), refreshing (`invalid_grant` → "sign in again"), revoking. Google's answers are checked with Zod. A network failure is "offline".
- `src/google/loopback.ts`: `127.0.0.1`, a free port, path `/signed-in`, one answer, then closed; anything else on the port is "Not found"; gives up after five minutes. The page says "You can close this tab".
- `src/google/token-store.ts`: the refresh token and email, encrypted with `safeStorage` through its async calls (`encryptStringAsync`, `decryptStringAsync`, `isAsyncEncryptionAvailable`; the sync ones are deprecated in Electron 45), written to `google-sign-in.bin` in the data folder with mode 600, written again when the Keychain asks.
- `src/google/connection.ts`: status (not set up, not connected, connected as, needs sign-in), connect, disconnect, and access tokens kept in memory until a minute before they run out.
- `src/google/google-api.ts`, `http-google.ts`: the Drive and Sheets calls folder 09 needs, over plain `fetch` (spec 105), and `fake-google.ts`, the in-memory Google for development and tests.
- `src/main/google-setup.ts`: the real connection (Keychain, `shell.openExternal` for https only, the loopback), or the fake one in an unpackaged build with `GOOGLE_FAKE=1`.
- Bridge `google.getStatus` and `google.connect`. Settings: the Google card (wireframe 2111-settings, Option 3, its words): "Not connected" with Connect Google, "Finish signing in in your web browser…", "Connected as …" with the folder sentence, and a plain message for each way it can fail.

## Verified

- `npm run check`: typecheck, lint, 1,175 tests. `connection.test.ts`: connect, restart, still connected; the token file holds neither the token nor the email in plain text; a forged state is refused; not set up never opens the browser. `oauth.test.ts`: every request's fields. The loopback test uses a real port.
- In the built app with `GOOGLE_FAKE=1` at 1100 wide: Settings, Connect Google, "Connected as owner@example.com" with Disconnect (screenshot looked at).
- The token is never logged: `main` logs only `google.status` with the status kind.

**Not checked:** connecting with the test account in the real browser, and still being connected after a restart, because spec 106's console steps are not done. Searching the logs and data folder for the token after a real sign-in is part of that check.

## Notes

- "Connected as" uses Drive's `about.get` (`user(emailAddress)`), which needs no scope beyond `drive.file`. If Google refuses it, the card says "Connected" without an email. To confirm with the test account.
