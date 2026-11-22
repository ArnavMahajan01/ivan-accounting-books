# 009: Bridge Contract and the First Bridge Function

Spec: [009](../feature-specs/00-foundations/009-bridge-contract.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `src/shared/bridge-contract.ts`:
  - `bridgeContract` maps each function name to a Zod input schema. The first function is `app.getInfo`, whose input is a strict empty object.
  - `BridgeResults` gives each function's success type (`AppInfo`: `version`, `development`).
  - Also: `BRIDGE_NAMES`, `BridgeError` (`invalid-input`, `not-allowed` or `internal`), the `BridgeApi` type of `window.bridge`, and `bridgeChannel(name)` (`bridge:app.getInfo`).
- `src/preload/index.ts`: puts one function per contract name on `window.bridge`, each calling `ipcRenderer.invoke` on its channel, and freezes the object. It does no work itself.
- `src/main/bridge.ts`:
  - `registerBridge` adds one `ipcMain.handle` per contract name.
  - `handleBridgeCall` checks every call in this order:
    1. The sender frame's URL must be the app's (`isAppUrl` from 008; Electron checklist item 17). Otherwise `not-allowed`.
    2. The input must match the schema. Otherwise `invalid-input`.
    3. The handler runs. If it throws, the result is `internal`, and the error text never reaches the page or the log.
  - Each refusal logs only `bridge.refused` or `bridge.failed`, the function name and the code.
- `src/main/handlers.ts`: `createHandlers(app)`. `app.getInfo` returns `app.getVersion()` and `development: !app.isPackaged`.
- `src/renderer/bridge.ts` types `window.bridge`. `App.tsx` calls `app.getInfo` and has loading, ready and failed states: it shows "Version 0.0.0, development", or the error code.
- `src/main/index.ts` registers the bridge. The `app.started` log field is now `devServer`, because it means "loading from the Vite dev server", and `development` read as if it contradicted the page.
- Tests: `bridge.test.ts` (11).

## Verified

- `npm run check`: typecheck (both configs) passed, lint passed, Vitest "Tests 177 passed (177)".
- The built app, launched with Playwright (`electron .`, so Electron reads the project's `package.json`):
  - The page shows "Accounting Books" and "Version 0.0.0, development".
  - `Object.keys(window.bridge)` is `["app.getInfo"]`, and the object is frozen.
  - `app.getInfo({})` gives `{ ok: true, value: { version: "0.0.0", development: true } }`.
  - `app.getInfo({ extra: "EFTPOS CAFE 12.50" })` and `app.getInfo("x")` both give `{ ok: false, error: { code: "invalid-input" } }`. The main process logged, each time, `{"level":"warn","scope":"main","event":"bridge.refused","fields":{"bridgeFunction":"app.getInfo","code":"invalid-input"}}`. The invented text did not appear in any log line.
  - No name other than the bridge is on `window`. The page's own property names were compared with a plain sandboxed window loading the same page with no preload: the only extra name was `bridge`.
- Unit tests also cover:
  - a call from another page, or with no sender frame (`not-allowed`, refused before the input is read);
  - six kinds of wrong input;
  - a handler that throws, whose message stays out of the log;
  - one IPC channel per contract name, and no others.

## Notes

- The sandboxed preload bundles Zod, because the contract file holds the schemas, so `out/preload/index.cjs` is larger than the bridge needs. If its size ever matters, move `BRIDGE_NAMES` to a file without schemas.
