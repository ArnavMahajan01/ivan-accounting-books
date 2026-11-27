---
name: google-sheets-drive
description: Google sign-in, Sheets and Drive for Accounting Books - the system-browser sign-in with PKCE and a loopback redirect, the refresh token kept with safeStorage, the drive.file scope, writing values as RAW, the app's own tabs and his, sharing by named email only, and reading the accountant's edits back as proposals. Use when editing src/google/, the sheet services, or when the task says "publish", "share", "sheet", "workbook", "Drive", "Google" or "accountant change".
---

# Google Sheets and Drive in Accounting Books

First check what is installed and what Google says today. The app calls Google with plain HTTPS through Node's own `fetch` (Node 24 in Electron 45), not a Google client library: nothing in `package.json` to check, but the REST references below change. Read the page for each endpoint you touch before writing against it, and note the date you read it. Do not rely on memory.

`context/security-context.md` ("Google Access", "Actions On The Client's Behalf", "Untrusted Input") and `context/decisions/google-sheets-approach.md` win over this skill.

## Where it is used

- `src/google/`: the only code that calls Google, signs in or touches a token. Main process only. It may import `shared`, `domain`, `data` and `services`, and never `electron` (lint rule, spec 003): main passes in what it needs from Electron, such as `safeStorage` as a small cipher and `shell.openExternal` as a function.
- `src/domain/workbook.ts`: pure. Which tabs and ranges are the app's, and the exact writes a publish needs. `src/domain/sheet-tabs.ts`: a report or the transaction list as rows of cells.
- `src/services/`: the sheet links and the accountant's changes in the books (`sheet_link`, `accountant_change`), each write with its audit row. Accepting a change goes through the posting service.
- `src/main/`: the bridge handlers, the two-minute sheet check, and the in-app sheet panel.
- The screens never see a token, a Google file id they could misuse, or an access token. They get views.

## This project's rules

1. **One scope: `https://www.googleapis.com/auth/drive.file`.** It reaches only files the app made. No full Drive, Gmail or contacts scope (`security-context.md`, "Google Access"). If something seems to need more, stop and ask.
2. **Sign-in in the system browser,** with PKCE (`S256`), a random `state`, and a loopback redirect on `127.0.0.1` with a free port that accepts one request and closes. Never an embedded window for sign-in (`decisions/google-sheets-approach.md`, risk G1).
3. **The refresh token is encrypted with `safeStorage`** (Keychain) and saved in the data folder. Main process only. Never in the database, a log, an error message or the screens. Access tokens live in memory only.
4. **`invalid_grant` means sign in again.** Show the banner ("Google needs you to sign in again"), stop the sheet check, never fail silently. A network failure is "Offline", and the action waits.
5. **Disconnect revokes at Google** (`https://oauth2.googleapis.com/revoke`), deletes the encrypted file, clears the sheet panel's session, and marks the links as disconnected. It never deletes a file in Drive.
6. **Values are written as `RAW`.** Bank text is never a formula for the accountant (`security-context.md`, "Untrusted Input"). The only cells written as formulas are the app's own examples on the Ready formulas tab, which hold no bank text.
7. **His work is kept.** The app writes only its own ranges on its own tabs, found by a developer-metadata marker, not by tab name. His tabs, his columns to the right and his rows below are never touched (`src/domain/workbook.ts`).
8. **Sharing is by named email only,** after he has seen the full email and role and confirmed. Never `type: anyone`, never a domain share. Roles map viewer → `reader`, commenter → `commenter`, editor → `writer`.
9. **A sheet edit is a proposal.** The check reads the allowed columns (Account, GST, Note), compares them with what was published, and saves new differences as `accountant_change` rows. Nothing changes the books until he accepts it in the app, through the posting service, which writes the audit row (invariant 3).
10. **Locked periods win.** A change to a line in a locked period cannot be accepted, and says why.
11. **The only background work is the read-only check every two minutes while the app is open.** Publishing, sharing, changing a role and stopping sharing happen only when he clicks.
12. **Never log** emails, file names, sheet contents, descriptions, amounts or tokens. Log the event and counts.

## Testing

- Unit tests pass a fake `fetch` and check each request: URL, method, body, and that `valueInputOption=RAW` is there.
- Development and the layout sweep can run the app against the in-memory Google in `src/google/fake-google.ts`, switched on with `GOOGLE_FAKE=1` in an unpackaged build only. It is never used by the packaged app.
- Checks against real Google use the author's test project and test accounts only (spec 106), never the client's.

## Links

- Sign-in for desktop apps: https://developers.google.com/identity/protocols/oauth2/native-app
- Refresh token expiry (7 days for an External app in Testing): https://developers.google.com/identity/protocols/oauth2
- Sheets API reference: https://developers.google.com/workspace/sheets/api/reference/rest
- Writing values: https://developers.google.com/workspace/sheets/api/guides/values
- Developer metadata: https://developers.google.com/workspace/sheets/api/guides/metadata
- Protected ranges: https://developers.google.com/workspace/sheets/api/samples/ranges
- Sheets scopes: https://developers.google.com/workspace/sheets/api/scopes
- Drive files: https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- Drive permissions: https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions
