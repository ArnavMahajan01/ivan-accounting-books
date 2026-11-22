# 013: Packaged Mac App and Fuses

Spec: [013](../feature-specs/00-foundations/013-package-app.md)
Status: Implemented, Finder check by the author pending
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- Installed electron-builder 26.18.0 and `@electron/fuses` 2.1.3 (development, pinned).
  - electron-builder was chosen over `@electron/packager` 20.3.0: it handles the file whitelist, unpacking the native module from the archive, fuses and ad-hoc signing in one config.
  - Its Windows-only `electron-winstaller` install script is denied in `allowScripts`.
- `electron-builder.yml`:
  - `appId: app.accountingbooks.desktop` and `productName: Accounting Books`. Both are placeholders that decide the data folder and Keychain access, so a tracker follow-up asks for the final ones before go-live.
  - A whitelist of `out/**/*` and `package.json`, plus production dependencies only (better-sqlite3 and Zod). better-sqlite3's C source, `binding.gyp` and its binaries for other platforms are excluded.
  - `npmRebuild: false`: the Node-API binary needs no compiling.
  - `mac`: target `dir`, arm64. `identity: '-'` (ad-hoc signature, no Apple Developer account) and `hardenedRuntime: false`, as electron-builder's docs require with ad-hoc signing.
  - Apple silicon will not run a binary whose signature was broken, and setting fuses changes the binary, so some signature is needed. Developer ID signing and notarizing stay in folder 12.
- `package.json`: `package` is `npm run build && electron-builder --mac --arm64`, giving `release/mac-arm64/Accounting Books.app`. React and React DOM moved to development dependencies. They are bundled into the renderer, so the package does not need them in `node_modules`.
- `src/main/launch-guard.ts`: `debuggingFlags(argv)`. The packaged app logs `app.debugging-refused` (a count only) and exits with code 1 if started with `--inspect`, `--inspect-brk`, `--inspect-port`, `--debug`, `--remote-debugging-port`, `--remote-debugging-pipe`, `--remote-allow-origins` or `--js-flags`.
- `src/main/index.ts`:
  - Developer tools are off in the packaged app (`devTools: !app.isPackaged`).
  - The packaged app gets a custom menu (`src/main/menu.ts`): the app, Edit and Window menus, with no View menu, so there is no reload or developer tools item.

### Fuses

Read from Electron 45.4.1 with `npx @electron/fuses read`: nine fuses. In the packaged app:

| Fuse | Electron default | Packaged | Why |
|---|---|---|---|
| RunAsNode | Enabled | **Disabled** | `ELECTRON_RUN_AS_NODE` must not turn the app into a Node runner |
| EnableCookieEncryption | Disabled | **Enabled** | Cookies on disk encrypted with the Keychain |
| EnableNodeOptionsEnvironmentVariable | Enabled | **Disabled** | `NODE_OPTIONS` must not inject code |
| EnableNodeCliInspectArguments | Enabled | **Disabled** | `--inspect` is ignored |
| EnableEmbeddedAsarIntegrityValidation | Disabled | **Enabled** | `app.asar` is checked against the hash in `Info.plist` |
| OnlyLoadAppFromAsar | Disabled | **Enabled** | The app runs only from its archive |
| LoadBrowserProcessSpecificV8Snapshot | Disabled | Disabled | Not used |
| GrantFileProtocolExtraPrivileges | Enabled | **Disabled** | Pages load from `app://`, so `file://` needs no extra rights |
| WasmTrapHandlers | Enabled | Enabled | Left on, as electron-builder offers no setting for it and it is a safety feature |

### Size

- `Accounting Books.app`: 266 MB.
  - `Contents/Frameworks` (Electron): 251 MB.
  - `app.asar`: 6.8 MB.
  - `app.asar.unpacked`: 2.0 MB.
- Before excluding better-sqlite3's source and other platforms' binaries, the app was 291 MB, with 27 MB unpacked.

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 213 passed (213)". `npm run format:check`: clean.
- `npm run package` built `release/mac-arm64/Accounting Books.app`:
  - The fuses read back as in the table.
  - `codesign --verify --deep --strict`: valid. `Signature=adhoc`, `Identifier=app.accountingbooks.desktop`. `Info.plist` has `ElectronAsarIntegrity`.
  - The archive holds only `out/main/index.js`, `out/preload/index.cjs`, `out/renderer/` (`index.html`, one JS file, one CSS file), `package.json`, and better-sqlite3 and Zod under `node_modules`. The only native binary is `app.asar.unpacked/node_modules/better-sqlite3/prebuilds/darwin-arm64.node`.
- Opened with `open`, as Finder does:
  - The app process started.
  - `~/Library/Application Support/Accounting Books`, with no ` Dev` suffix, did not exist before and then held `books.db` and `logs/app.log`.
  - The log shows `books.opened {"schemaVersion":1}` and `app.started`. So the packaged app loaded better-sqlite3 from the unpacked folder and applied migration 1.
- With the packaged app running, its binary was started with `ELECTRON_RUN_AS_NODE=1 ... -e "console.log('NODE MODE')"`. It did not print `NODE MODE`. It started as the app, found the first one, logged `app.second-instance-quit`, and exited 0. So the RunAsNode fuse is off.
- `--remote-debugging-port=9222` and `--inspect=9229`: each exit code 1, logged as `app.debugging-refused {"flags":1}`.

**Not checked, for the author:** what the window shows. Open `release/mac-arm64/Accounting Books.app` from Finder (the first time: right-click, Open, because it is not notarized). It should show "Accounting Books", "Version 0.0.0" (no "development") and "Schema version 1, integrity: ok". A script cannot read the packaged window, because its debugging is now refused. Spec 014 adds an automatic check of the page.

## Notes

- `npm audit` reports 6 moderate issues, all from one `minimatch` advisory (GHSA-g3hv-75wg-m249, a slow pattern match) inside electron-builder's own dependencies. It runs only at build time, on patterns written in this project. npm's only fix is downgrading to electron-builder 25, a breaking change, so it was left. Recheck when electron-builder updates.
- Running the packaged app on this Mac created `~/Library/Application Support/Accounting Books`, the packaged app's real data folder name, holding an empty test database. On the client's Mac that folder will hold the real books. It is on the author's Mac only because the app was tested here.
- The default Electron icon is used. An icon is a design task (folder 02).
