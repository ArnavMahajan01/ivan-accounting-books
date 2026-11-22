# 010: App Name, Data Folders and Log File

Spec: [010](../feature-specs/00-foundations/010-data-folders.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `package.json` `productName`: "Accounting Books", the working title. It decides the data folder, and it must never change after go-live (`architecture-context.md`, "Updating"). A tracker follow-up asks for the final name before folder 12.
- `src/main/app-identity.ts`:
  - `runName(productName, isPackaged)` gives the product name for the packaged app, and the product name plus ` Dev` for every other run: `npm run dev`, and the built but unpackaged app that tests launch. The suffix is never added twice.
  - `dataFolder(appData, name)` is the folder for that name.
- `src/main/index.ts` sets the name and `userData` before anything else (before the instance lock, which is scoped to `userData`). So the two names never share a data folder or a lock (risk D4).
- Closing the window quits the app (`window-all-closed`, logged as `app.quit-on-close`). This is client question 17's safe assumption. The question is still open.
- `src/main/log-file.ts`:
  - `logFileSink` appends one JSON line per record, with the time from the `Clock`, to `<data folder>/logs/app.log`.
  - The file is created with mode `0600`.
  - Before a line would take the file past 5 MB, it rotates to `app.1.log`, `app.2.log` and `app.3.log`, deleting the oldest.
  - `teeSinks` writes to several sinks. Development writes to the file and the console, and the packaged app to the file only. The file holds only what the 007 logger allows.
- Tests: `app-identity.test.ts` (4) and `log-file.test.ts` (5), using a temporary folder, never the real data folder.

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 186 passed (186)".
- The built app, launched with Playwright:
  - Name `Accounting Books Dev`. Data folder `~/Library/Application Support/Accounting Books Dev`, which holds `logs/app.log`, 379 bytes, `-rw-------`.
  - The log file, read after a run that sent the bridge a wrong input, has three lines: `app.started` (`devServer: false`), `bridge.refused` (`bridgeFunction: app.getInfo`, `code: invalid-input`) and `app.quit-on-close`, each with a time. No amount, name or description appears.
  - Closing the window from the main process made the app exit with code 0.
- Rotation (unit test): 60 records with a 300-byte limit left exactly `app.log`, `app.1.log`, `app.2.log` and `app.3.log`, each 300 bytes or less. The newest record is last in `app.log`.
- A refused private field (`payeeName`) writes nothing to the file (unit test).

Not checked: the packaged name without ` Dev`. That needs the packaged app, at spec 013.

## Notes

- **Leftover folders.** The earlier 008 and 009 runs, made before the name was set, created `~/Library/Application Support/accounting-books` (14 MB, Chromium caches only). `~/Library/Application Support/Electron` (327 MB) is Electron's default name and may also belong to other unpackaged Electron apps on this Mac. Neither holds books. Neither was deleted. That is the author's call.
- Every test run that launches Electron now uses ` Dev`, so no test can open the packaged app's books.
