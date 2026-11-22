# 008: Hardened Electron Window

Spec: [008](../feature-specs/00-foundations/008-electron-window.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- Installed, pinned exactly:
  - production: React 19.3.1 and React DOM 19.3.1.
  - development: electron-vite 6.0.0, `@vitejs/plugin-react` 6.3.0, `@types/react` and `@types/react-dom` 19.3.0, and `@playwright/test` 1.65.1. Playwright was installed now to drive the app for these checks. Spec 014 writes its real test.
- Read first: the Electron security checklist (electronjs.org, linked to v45.4.1, 20 items), the `app.requestSingleInstanceLock` docs, the electron-vite guide and config pages (labelled v5), and electron-vite 6.0.0's own source for how it picks the preload output format.
- `electron.vite.config.ts`:
  - main, preload and renderer each read the aliases from `tsconfig.json` (`resolve.tsconfigPaths`).
  - The preload is built as one self-contained CommonJS file, `out/preload/index.cjs`. Because `package.json` has `"type": "module"`, electron-vite would otherwise output an ES module preload, and Electron runs those only with the sandbox off.
- `src/main/index.ts`:
  - One window, 1100 by 700 minimum, shown when ready.
  - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `nodeIntegrationInSubFrames: false`, `webSecurity: true`, `allowRunningInsecureContent: false`, `experimentalFeatures: false`, `webviewTag: false`.
  - A single-instance lock: a second launch logs `app.second-instance-quit` and quits, and the first logs `app.second-instance-focused` and restores and focuses its window.
  - Every web contents blocks `will-navigate` and `will-redirect` to anything but the app, blocks subframe navigation and `<webview>`, and denies every new window.
  - Permissions: the request handler, the check handler and the device handler all deny everything.
- `src/main/app-protocol.ts`:
  - A built app loads its pages from a private `app://bundle/` scheme, not `file://` (Electron checklist item 18).
  - `resolveAppFile` maps a URL to a file inside `out/renderer`, or refuses it.
  - Every response carries the content security policy and `X-Content-Type-Options: nosniff`.
- `src/main/navigation.ts`: `isAppUrl` compares scheme and host, never origin strings (`desktop-app.md`). In development, the only allowed address is the exact Vite dev server, and only when the app is not packaged.
- `src/main/csp.ts`:
  - Packaged policy: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'`.
  - Development adds the Vite live-reload socket and inline styles (Vite injects CSS as `<style>` tags while developing). It allows React Fast Refresh's one fixed inline script by its SHA-256 hash, computed in `electron.vite.config.ts` from the plugin's exported `preambleCode`. Inline scripts are never allowed in general.
- `src/renderer/`: `index.html`, `main.tsx` and `App.tsx` (a page that says "Accounting Books"), `styles.css` (system font, light and dark). `src/renderer/tsconfig.json` adds the DOM library and JSX for the renderer only. The root `tsconfig.json` excludes `src/renderer`, so main-process code cannot use browser types. The 002 placeholder `src/renderer/index.ts` was deleted, because `index.html` is now the entry point.
- `package.json`:
  - `"main": "./out/main/index.js"`.
  - `dev` is `env -u ELECTRON_RUN_AS_NODE electron-vite dev`, and `build` is `electron-vite build`.
  - `typecheck` checks both configs.
- Tests: `csp.test.ts`, `app-protocol.test.ts` and `navigation.test.ts`.

## Verified

- `npm run check`: typecheck (both configs) passed, lint passed, Vitest "Tests 166 passed (166)".
- `npm run build`: `out/main/index.js` 6.59 kB, `out/preload/index.cjs`, `out/renderer/` (React's production build, not minified, which is electron-vite's default for Electron).
- Electron binary: 45.4.1, `Mach-O 64-bit executable arm64`, downloaded on first launch.
- The built app, driven with Playwright `_electron`:
  - The window shows `app://bundle/index.html` with the heading "Accounting Books", in the system font.
  - In the page, `typeof require`, `typeof process` and `typeof module` are all `"undefined"`. The main process reports `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
  - The response carries the packaged policy above.
  - An injected inline `<script>` did not run.
  - `new Function(...)` from the app's own code threw `EvalError`. This was checked with a throwaway `App.tsx`, then restored. Playwright's own `evaluate` runs through DevTools, which the policy does not cover, so it could not prove this.
  - `window.open` returned `null`, and the window count stayed 1. The notifications permission is `denied`, and geolocation is denied (code 1).
  - `fetch('app://bundle/..%2f..%2fpackage.json')` gave 404. `location.href = 'https://example.com/'` left the window on `app://bundle/index.html`.
  - Second launch: the second process exited with status 0 after logging `app.second-instance-quit`. The first logged `app.second-instance-focused`.
- Development mode:
  - `electron-vite dev --rendererOnly` served the development policy, with the hash `sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk=`.
  - Electron, loading that server, rendered the heading with no console errors and no policy violation, so the Fast Refresh script was allowed by its hash.
  - `npm run dev` from a terminal with `ELECTRON_RUN_AS_NODE=1` set logged `app.started {"development":true}`, then was stopped.
- Inside Electron, closing the 005 and 006 follow-ups:
  - Formatting `"-1234.50"` with `en-AU` AUD gives `-$1,234.50` in both main and renderer, and the largest safe amount formats exactly.
  - With `TZ=Australia/Sydney`, the local date of `2026-11-21T14:30:00Z` is 22 November, while the UTC date is the 21st.
  - Versions: Electron 45.4.1, Node 24.22.3, Chrome 156.

Not checked: "a second launch focuses it" was seen in the logs, not on screen. Focusing a window cannot be observed from a script.

## Notes

- **VS Code's terminal sets `ELECTRON_RUN_AS_NODE=1`.** It makes Electron behave as plain Node: `Electron --version` printed Node's `v24.22.3`. `npm run dev` clears it. Any other script that launches Electron must clear it too (`desktop-app.md`, "Testing", warns of this).
- The app's name is still Electron's default ("Electron", data in `Application Support/Electron`) until spec 010 sets the product name and the ` Dev` name.
- Fixed during the spec:
  - The renderer config first included `src/shared`, which pulled in `env.ts` (which reads `process`) and failed typecheck. It now includes only `src/renderer`, plus what that imports.
  - Two `app-protocol` test cases expected `app://bundle/../package.json` to be refused. The URL parser already resolves `..` to `/package.json`, inside the folder, so the expectation was wrong. The test now checks they stay inside.
