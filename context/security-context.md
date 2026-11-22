# Security Context

This app holds a real business's complete financial records: every bank transaction, its customers and suppliers, its GST and profit figures, and a sign-in to the owner's Google Workspace. Every rule here is required, even though there is one user and the data is local. If a spec conflicts with this file, stop and ask the author.

`security-risks.md` tracks specific risks, their owners, and what is open. The general rules are in `context/rules/security-rules.md`.

## What Needs Protecting

| Data | Where it may live |
|---|---|
| The books (the SQLite file) | The app data folder on the client's Mac, and encrypted backups the client chose. Never in the repo, the app bundle, logs or a chat |
| Imported bank files | Read once at import. The app keeps the parsed lines, never a copy of the file |
| Bank account numbers | Only the last four digits are stored |
| The Google refresh token | Encrypted with `safeStorage` in the data folder. Main process only |
| Published sheets | The client's Google Drive, shared only with emails he confirmed |
| Signing keys and the Apple Developer account | The author's secure storage. Never git or the app bundle |
| The OAuth client id | `.env` in development, app configuration when packaged. Not a secret for a desktop app, but kept out of git |

## Secrets

- Never commit `.env` files, keys, tokens or credentials. Only `.env.example` is committed, with placeholder values.
- Anything in the app bundle can be read by anyone who has the app.
- Rotate a secret immediately if it appears in git, a log or a chat.
- Run a secret scan before the first push, and keep the repo private.

## Logging

- Never log descriptions, amounts, account names or numbers, contact names, emails, file contents, file names from the client's folders, or tokens.
- Log ids, event types, counts and error codes: "import imp_7f3 finished: 42 new, 3 duplicate, 0 rejected".
- No telemetry, analytics or crash upload. Logs stay in the data folder, rotate at a fixed size, and can be cleared from Settings.

## Test Data And AI Tools

- Sample data uses an invented business, invented contacts, invented descriptions and invented amounts.
- A bank file fixture copies a real format with invented content. The only real thing the author may receive from the client is a CSV header row with no transactions (client question 16).
- Real files are never committed, never pasted into specs, issues, progress files, commits, guides or AI prompts, and never opened by the developer during development.

## Google Access

- The narrowest scope that works: `drive.file`, confirmed at spec 106. No full Drive access, no Gmail, no contacts.
- Sign-in through the system browser, with PKCE, a random state, and a loopback redirect on `127.0.0.1` that accepts one request and closes.
- Only `src/google/` uses tokens. Screens never see them.
- Disconnect revokes the token with Google, deletes the encrypted file, and marks every sheet link as disconnected.
- An expired or revoked connection shows a banner. It never fails silently.

## Actions On The Client's Behalf

- Publishing, sharing, changing a role and stopping sharing happen only when the client clicks them. Nothing is shared automatically.
- Before a share is sent, the app shows the full email address and the role, and asks him to confirm.
- The app never creates an "anyone with the link" share, and never deletes a file in Drive.
- An accountant's edit never changes the ledger by itself. It waits for the client to accept it.
- The only background work is the sheet check every two minutes (read only) and the scheduled backup the client switched on.

## Untrusted Input

Bank files, the contents of shared sheets, backup files chosen for restore, and anything typed in are untrusted.

- Bank files have a size limit, are parsed only by `src/import/`, and are validated row by row.
- Text from bank files and sheets is shown as text, never as HTML.
- Values written to Google Sheets use `RAW`, and CSV exports put a leading apostrophe on any cell starting with `=`, `+`, `-` or `@`, so no text from a bank becomes a formula for the accountant.
- A restore validates the file and its schema version before replacing anything, and keeps the current file until the restore succeeds.
- Links open in the system browser, and only `https` is allowed.

## The Electron Shell

- Context isolation on, sandbox on, Node integration off, in every window.
- Load only the app's own content. Block other navigation, new windows and frames.
- A content security policy with no broad inline scripts.
- Permissions denied by default.
- A single-instance lock.
- Packaged builds: developer tools off, debugging flags refused, the risky Electron fuses turned off, a whitelist of packaged files.
- Electron's version is pinned and kept current.

## Data On The Device

- The data file is protected at rest by the method chosen in `decisions/local-data-storage.md`. Until it is decided, assume FileVault is the only protection, and say so to the client.
- The app data folder holds nothing outside the app's own files.
- Notifications, if any, never show amounts or names.

## Files And Sharing

- No public links.
- Exports are saved only where the client chooses, through the system save dialog.
- Generated PDFs and sheets carry no hidden data beyond what the report shows. The row key column in a sheet holds ids only.

## Backups And Recovery

- The books live only on the Mac, so backups are what stand between the client and lost records. The ATO expects five years of records.
- Backups are encrypted before they leave the Mac, with a key or passphrase the client controls (designed in folder 11).
- A restore is tried on the client's Mac before go-live, and recorded.
- The handover tells the client in plain words what the app holds, where, what to back up, and what to do if the Mac is lost.

## Before Real Data Goes Live

Development uses invented data and a test Google account. Real accounts and real bank files are connected only in folder 12.

Before connecting real data, confirm:

1. Every item in `security-risks.md` due by then is fixed.
2. The logs were checked after a full run, and contain no private data.
3. The build is the packaged, signed one, with hardening on.
4. A backup and a restore have both worked on the client's Mac.
5. The client has agreed, in writing, to the Google access the app needs.
6. The client has been told what the app holds, where, and what to do if the Mac is lost.
