# 014: Package Contents Check and First End-to-End Test

Spec: [014](../feature-specs/00-foundations/014-package-checks.md)
Status: Done, with one change from the spec (self-check mode, below)
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `tools/package-problems.ts`: `findPackageProblems(files, homeDir)` reports:
  - a file containing the developer's home path (any file, binaries included);
  - a `.env` or `.env.*` file anywhere;
  - a `tests`, `tools`, `references`, `wireframe` or `context` folder among the app's own files.
  - Folder names are not checked inside dependencies, because Zod, for one, ships a harmless `tests` folder.
- `tools/check-package.ts`: run by `npm run package` after electron-builder. It walks every file in the `.app` and every file inside `app.asar`, read with `@electron/asar` 4.3.2 (now a pinned development dependency). It prints paths and reasons, never contents, and exits 1 on any problem, so `npm run package` fails. Node 26 runs it as TypeScript directly. `tsconfig.json` gained `allowImportingTsExtensions` for its `.ts` import.
- `electron-builder.yml` now also leaves out Zod's TypeScript source and tests, and every dependency's type definitions and source maps. `app.asar` went from 6.8 MB to 3.4 MB.
- **Self-check mode** (`src/main/self-check.ts`, wired into `src/main/index.ts`):
  - `--self-check=<folder>` runs the real app with that folder as its data folder. When the page has loaded, it reads only the two status lines (`[data-testid="app-info"]` and `[data-testid="data-status"]`), writes them to `<folder>/self-check.json`, and quits with code 0.
  - The folder must be absolute and empty or not yet made. Otherwise the app exits with code 2 before opening anything, and writes nothing anywhere: no log line either.
- `playwright.config.ts` and `tests/e2e/packaged-app.spec.ts`. Two tests launch the packaged binary:
  1. A throwaway folder gives `self-check.json` = `{ appInfo: "Version 0.0.0", dataStatus: "Schema version 1, integrity: ok", packaged: true }`, plus `books.db` and log lines `books.opened` and `app.self-check-finished`.
  2. A folder already holding a file is refused (exit 2), and the file is untouched.
  - After each test, a guard fails if the log file in the packaged app's real data folder on this Mac changed.
- Script `test:e2e`: `npm run package && playwright test`. Listed in `code-standards.md` ("Scripts") and in `CLAUDE.md` section 4, whose table now shows `dev`, `build` and `package` working.
- `.gitignore`: `test-results/` and `playwright-report/`.

### The change from the spec

The spec asks for a Playwright test that launches the packaged app and checks its page. Playwright controls an Electron app through the debugger, and spec 013 turned that off in the packaged app (the fuse for `--inspect`, and the refusal of remote debugging). Turning it back on would test a different app from the one the client gets. So the test launches the real packaged app in self-check mode instead, and the app reports its own page. The mode cannot reach the real books, because its folder must be empty, and it reads only the two status lines, which never hold private data.

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 225 passed (225)", including 9 for `findPackageProblems` and 4 for `parseSelfCheckArg`.
- `npm run package` (16 s): "Package check passed: 602 files in release/mac-arm64/Accounting Books.app, none with a private or development file."
- The check fails, then passes (the spec's check):
  - A built `out/` with an added `leak.txt` holding the home path, and an `out/tests/fixture.txt`, packaged, gave "Package check failed: 3 problem(s)": `home-path: /Contents/Resources/app.asar`, `home-path: /app.asar/out/leak.txt`, `forbidden-folder: /app.asar/out/tests/fixture.txt`. Run without a pipe, the check exited 1.
  - With both removed and repackaged, it passed, and `npm run package` exited 0.
- `npm run test:e2e`: "2 passed (3.3s)".
- **Found and fixed during the spec:** the first run of test 2 wrote `app.self-check-refused` into the packaged app's real log (`~/Library/Application Support/Accounting Books/logs/app.log`, changed at 17:43:31). A refused self-check now logs to the terminal only. The guard was added, and the rerun left that file's time at 17:43:31.

## Notes

- The e2e test opens a window for about 2 seconds while it runs.
- `npm run test:e2e` rebuilds and repackages every time, so it always tests the current code. It takes about 20 seconds.
