---
name: electron
description: Electron for Accounting Books - the hardened window, the private app:// scheme, the bridge between screens and the main process, the data folder, and packaging with fuses. Use when editing src/main/, src/preload/, src/shared/bridge-contract.ts, electron.vite.config.ts or electron-builder.yml, adding a "bridge function", running "npm run dev", "package the app", or seeing an Electron launch, CSP, sandbox or fuse error.
---

# Electron in Accounting Books

First check the installed versions in `node_modules/electron/package.json` (45.4.1 when this was written, with Node 24.22 and Chrome 156), `node_modules/electron-vite/package.json` (6.0.0) and `node_modules/electron-builder/package.json` (26.18.0). If an option or error looks unfamiliar, read the linked docs for that version. Do not rely on memory.

`context/rules/desktop-app.md`, `context/architecture-context.md` and `context/security-context.md` win over this skill.

## Where it is used

- `src/main/`: the only folder that imports `electron`, apart from `src/preload/`. The lint rule (spec 003) enforces it.
  - `index.ts`: start-up order, the window and its settings, the instance lock, the bridge and the books.
  - `app-protocol.ts`: the private `app://bundle/` scheme.
  - `csp.ts`: the content security policy.
  - `navigation.ts`: which addresses are the app's.
  - `bridge.ts`: the IPC handlers.
  - `handlers.ts`: one handler per bridge function.
  - `app-identity.ts`: the ` Dev` name and data folder.
  - `log-file.ts`: the rotating log.
  - `launch-guard.ts`: refuses debugging flags.
  - `menu.ts`: the packaged menu.
  - `self-check.ts`: the end-to-end mode.
  - `clock.ts` and `random.ts`: the real clock and random source.
- `src/preload/index.ts`: puts the contract's functions on `window.bridge`, frozen. It does nothing else.
- `src/shared/bridge-contract.ts`: the names, Zod input schemas and result types, shared by main, preload and renderer.
- `src/renderer/bridge.ts`: the typed `window.bridge` the screens use.
- `electron.vite.config.ts` builds `out/main/index.js`, `out/preload/index.cjs` and `out/renderer/`. `electron-builder.yml` packages them into `release/mac-arm64/Accounting Books.app`.
- `domain`, `import`, `data`, `services`, `google`, `backup` and `renderer` never import `electron`.

## The settings that must never be turned off

The full list and why: `context/rules/desktop-app.md` ("Shell security settings", "Packaging"). As built in specs 008, 010 and 013:

- `webPreferences`:
  - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `nodeIntegrationInSubFrames: false`, `webSecurity: true`;
  - `allowRunningInsecureContent: false`, `experimentalFeatures: false`, `webviewTag: false`;
  - `devTools: !app.isPackaged`.
- Pages load from `app://bundle/` (packaged) or the exact Vite dev server (development only), never `file://`. `isAppUrl` compares scheme and host, never origin strings.
- Every web contents blocks other navigation, redirects, subframe navigation, `<webview>` and new windows. The permission request, check and device handlers all deny.
- The policy in `csp.ts`: no inline script and no `eval`. In development only, React Fast Refresh's one fixed inline script is allowed by its SHA-256 hash, computed in `electron.vite.config.ts`. Never add `'unsafe-inline'` or `'unsafe-eval'` to `script-src`.
- A single-instance lock, taken after the name and data folder are set (the lock is scoped to `userData`).
- Every unpackaged run uses the name `Accounting Books Dev` and its own data folder (risk D4). Never let a test or `npm run dev` use the packaged folder.
- Packaged app:
  - fuses as listed in `electron-builder.yml` (RunAsNode, `NODE_OPTIONS` and `--inspect` off; asar integrity and only-from-asar on; cookie encryption on);
  - debugging flags refused (`launch-guard.ts`);
  - the custom menu with no View menu.
- `appId` and `productName` decide the data folder and Keychain access. Never change them casually (`architecture-context.md`, "Updating").

## Add a bridge function

The only way a screen reaches the main process. Example name: `books.getSummary`.

1. **Contract** (`src/shared/bridge-contract.ts`):
   - Add an entry to `bridgeContract` with a strict Zod schema for its input, for example `'books.getSummary': { input: z.object({ periodEnd: z.string() }).strict() }`.
   - Add its success type to `BridgeResults`.
   - Names are `area.verbNoun`. Keep each function narrow: never a general "run query" or "read file".
2. **Handler** (`src/main/handlers.ts`): add `'books.getSummary': (input) => ...` to `createHandlers`. TypeScript refuses to compile until every contract name has a handler.
   - The handler gets input that `handleBridgeCall` has already checked: the sender is the app's page, and the input passed the schema.
   - It returns a `Result` (`ok(...)` or `err({ code })`).
   - It calls one service in `src/services/`, and never runs SQL or calls Google itself. Pass anything it needs (the store, the clock) through `HandlerDeps`.
3. **Preload:** no change. It exposes every name in `BRIDGE_NAMES`.
4. **Screen:** call `bridge()['books.getSummary']({ periodEnd })` from `src/renderer/bridge.ts`. Handle loading, `result.ok`, and `result.error.code`, with `useBridge` from `src/renderer/pages/use-bridge.ts`.
5. **Tests** (`src/main/bridge.test.ts`): one call with valid input, and one with wrong input returning `invalid-input`, plus the service's own tests. `registerBridge` registers one IPC channel per name, `bridge:<name>`.
6. **Check:** `npm run check`, then `npm run build` and the app. Logs must show only the event and a code, never the input.

## Settings in use

- `electron.vite.config.ts`:
  - each part uses `resolve.tsconfigPaths: true`, so the aliases come from `tsconfig.json`.
  - The preload is forced to one self-contained CommonJS file (`externalizeDeps: false`, `format: 'cjs'`, `index.cjs`). Because `package.json` has `"type": "module"`, electron-vite would otherwise output an ES module preload, which Electron runs only with the sandbox off.
  - The renderer's dev server sends the development policy as a header.
- `electron-builder.yml`:
  - a whitelist of `out/**` and `package.json`, plus production dependencies (better-sqlite3, Zod). Trimmed: better-sqlite3's C source and other platforms' binaries, Zod's source, type definitions and source maps.
  - `npmRebuild: false`: better-sqlite3 13 is a Node-API module with a prebuilt arm64 binary.
  - Ad-hoc signing (`identity: '-'`, `hardenedRuntime: false`), so Apple silicon runs the binary after the fuses change it.
- `npm run package` runs `tools/check-package.ts` afterwards. It fails if the home path, a `.env` file, or `tests`, `tools`, `references`, `wireframe` or `context` are inside the app.

## Things that changed in recent versions

Models remember older Electron. In the installed version:

- Preload scripts are sandboxed by default (since 20). A sandboxed preload cannot `require` most Node modules, and an ES module preload needs the sandbox off. This project bundles the preload into one CommonJS file instead.
- `protocol.handle(scheme, request => Response)` replaces the old `registerFileProtocol`, `registerBufferProtocol` and similar.
- `will-frame-navigate` gives subframe navigation, with `event.isMainFrame`.
- `session.setDevicePermissionHandler` exists beside the request and check handlers.
- Electron 45 downloads its binary on first launch, not at `npm install`.
- electron-vite 6 with Vite 8: options are under `build.rolldownOptions`, not `rollupOptions`. Dependencies are externalized with `build.externalizeDeps`, not `externalizeDepsPlugin`.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| `sandbox: false` or `contextIsolation: false` to make a preload work | Keep both on. Bundle the preload (it already is), and do the work in main behind a bridge function |
| `ipcRenderer` or `require` in a screen | `window.bridge` only, through `src/renderer/bridge.ts` |
| A handler that trusts its input or runs SQL | `handleBridgeCall` validates; the handler calls a service |
| `loadFile(...)` or a `file://` URL | `APP_ENTRY_URL` (`app://bundle/index.html`) |
| Adding `'unsafe-inline'` to fix a policy error | Find the inline script. Allow a fixed one by its hash, or move it into a file |
| Logging the bridge input or an error message with a path | Log the event, the function name and a code |
| Launching Electron from the VS Code terminal as is | It sets `ELECTRON_RUN_AS_NODE=1`. `npm run dev` clears it. Any other launch must too |
| Running `out/main/index.js` directly | Run `electron .` (or Playwright with `args: ['.']`), so Electron reads `package.json` and the name is right |
| Changing `appId` or `productName` | It moves the data folder. Ask the author first |

## Testing

- The pure parts have unit tests next to them: `navigation`, `app-protocol`, `csp`, `bridge`, `app-identity`, `log-file`, `launch-guard` and `self-check`. `bridge.test.ts` uses `createTestDatabase()` and a capturing logger.
- The built, unpackaged app can be driven with Playwright `_electron.launch({ args: ['.'], env })`. Remove `ELECTRON_RUN_AS_NODE` from `env`. It uses the ` Dev` data folder.
- The packaged app refuses debugging, so `npm run test:e2e` runs it in self-check mode: `--self-check=<empty folder>` records the version and books status lines into `self-check.json` and quits (`tests/e2e/packaged-app.spec.ts`). The test also fails if the real data folder's log changes.

## When it goes wrong

- **`Electron --version` prints a Node version, or the app acts like a plain Node script:** `ELECTRON_RUN_AS_NODE=1` is set. Unset it.
- **The preload does not run, or `window.bridge` is undefined:** check that `out/preload/index.cjs` exists and that the window's `preload` path points to it.
- **"Refused to execute inline script" in development:** the Fast Refresh preamble changed. The hash is computed from `react.preambleCode` in `electron.vite.config.ts`, so rebuild. If it still fails, find the new inline script.
- **The packaged app exits at once with code 1:** a debugging flag is on the command line (`app.debugging-refused` in the log). Code 2 means a refused `--self-check` folder.
- **The packaged app will not open the first time:** it is not notarized. Right-click, Open.
- **"Package check failed":** read the listed paths. A `home-path` hit means a built file embeds an absolute path. Find what put it there.

## Links

- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron `app` API (single instance lock, paths)](https://www.electronjs.org/docs/latest/api/app)
- [Electron `protocol.handle`](https://www.electronjs.org/docs/latest/api/protocol)
- [Electron process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)
- [electron-vite guide](https://electron-vite.org/guide/) and [config](https://electron-vite.org/config/)
- [electron-builder configuration](https://www.electron.build/configuration)
