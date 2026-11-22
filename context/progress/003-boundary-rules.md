# 003: Import Boundary and Purity Lint Rules

Spec: [003](../feature-specs/00-foundations/003-boundary-rules.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- Installed `eslint-plugin-boundaries` 7.4.4 (peer: ESLint 6 or later, so ESLint 10 works) and `eslint-import-resolver-typescript` 4.4.5, which lets the plugin follow the `@shared/*` style aliases in `tsconfig.json`. Both pinned exactly.
- Option names were checked against the installed types (`node_modules/@boundaries/config/dist/index.d.ts`, `node_modules/@boundaries/elements/dist/index.d.ts`) and the docs at jsboundaries.dev (quick start, settings, TypeScript support, dependencies rule, policies; those pages are labelled 7.4.1).
- `eslint.config.js`, for files in `src/`:
  - Each of the ten `src/` folders is an element. `allowedImports` lists the allowed directions from `architecture-context.md` in one table. Default is disallow, so any unlisted local import fails.
  - `checkAllOrigins: true`, so outside packages and Node modules are checked too. They are allowed by default, then banned where needed:
    - `domain` and `import`: no Node built-in module (`fs`, `path` and the rest).
    - `domain`, `import` and `renderer`: no network module (a named list, including `googleapis`). A spec that installs a new network client adds it to `networkModules`.
    - `renderer`: no Node built-in module.
    - `electron` only from `main` and `preload`.
    - `better-sqlite3` only from `data`.
  - `boundaries/no-unknown-files`: a file in `src/` outside the ten folders fails.
  - `domain` and `import` (purity): `Date.now`, `new Date()` with no argument, `Date()` as a call, `Math.random`, and the globals `fetch`, `XMLHttpRequest` and `WebSocket` are errors.
- Messages name both sides and point to `architecture-context.md`, "System Boundaries".

Choices where the spec left room: `Date()` called without `new` (it also returns the current time) and the network globals were added to the purity rules, since they read the clock or the network as surely as the named ones. The `renderer` rule is "only `shared`", because the bridge contract lives in `src/shared/bridge-contract.ts` (spec 009).

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest 1 test passed.
- Each rule fires. Throwaway files, then `npx eslint src`, then the files deleted (`git status` afterwards showed only the real files):

| Throwaway file | Content | Result |
|---|---|---|
| `src/domain/tmp-data.ts` | `import '@data/index'` | `domain may not import data` (boundaries/dependencies) |
| `src/domain/tmp-relative.ts` | `import '../services/index'` | `domain may not import services` |
| `src/shared/tmp-up.ts` | `import '@domain/index'` | `shared may not import domain` |
| `src/domain/tmp-fs.ts` | `import { readFileSync } from 'node:fs'` | `domain is pure and may not import the Node module node:fs` |
| `src/import/tmp-random.ts` | `Math.random()` | `Pure code may not use randomness` (no-restricted-syntax) |
| `src/import/tmp-now.ts` | `Date.now()`, `new Date()`, `new Date('2026-01-01')` | Lines 1 and 2: `Pure code may not read the clock`. Line 3 passes |
| `src/domain/tmp-fetch.ts` | `fetch` | `Unexpected use of 'fetch'. Pure code may not use the network` |
| `src/renderer/tmp-electron.ts` | `import 'electron'` | `renderer may not import electron. Only main and preload may` |
| `src/renderer/tmp-path.ts` | `import 'node:path'` | `renderer may not import the Node module node:path` |
| `src/renderer/tmp-main.ts` | `import '@main/index'` | `renderer may not import main` |
| `src/services/tmp-sqlite.ts` | `import 'better-sqlite3'` | `services may not import better-sqlite3. Only data talks to SQLite` |
| `src/tmp-unknown.ts` | `export {}` | `File does not match any file pattern and does not belong to any known element` |
| `src/domain/tmp-shared.ts` | `import '@shared/index'` | No error |
| `src/main/tmp-ok.ts` | `@services/index`, `electron`, `node:fs` | No error |

Total: "13 problems (13 errors, 0 warnings)", one for each forbidden line, none for the allowed ones.

## Notes

- `tools/` and root config files are outside these rules (`files: src/**`). The seed tool may import services when it arrives.
- The `parseFloat` and `toFixed` ban is spec 005, not this one.
- npm still reports `fsevents` with its install script blocked (see 001).
