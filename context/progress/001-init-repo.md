# 001: Initialize the Repository and Tooling

Spec: [001](../feature-specs/00-foundations/001-init-repo.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- The author ran `git init` and `git checkout -b feature/00-foundations`. Nothing is staged or committed.
- `package.json` with the scripts `dev`, `build`, `package` (each prints "Not built yet" and exits 1 until specs 008 and 013), `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch` and `check` (typecheck, then lint, then test). Every dev dependency is pinned to an exact version, Electron included. `engines.node` is `>=24`.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, plus `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. No emit (the build tool emits, from 008).
- `eslint.config.js`: ESLint recommended plus `typescript-eslint` strict type-checked rules. `no-explicit-any` and `no-console` are errors, and `no-console` is off in `tools/`. `context/`, `wireframe/`, `references/` and `.claude/` are not linted.
- `.prettierrc.json` and `.prettierignore`. Markdown, `context/`, `wireframe/`, `references/` and `.claude/` are never reformatted, so hand-written planning files stay as written.
- `vitest.config.ts`: finds `*.test.ts` under `src/` and `tools/`.
- `.gitignore` with every entry the spec lists, plus `coverage/`, `.env.*` (except `.env.example`), `.claude/settings.local.json`, and SQLite side files (`*.db-*`, `*.sqlite-*`). `references/` and `wireframe/brain/*.png` are anchored to the project root (see Notes).
- `.env.example` with no variables yet (spec 007 adds them).
- One trivial test, `src/shared/setup.test.ts`, to be removed at spec 004 when real tests exist.

### Versions checked on 2026-11-22

Checked with `npm view <package> version` against the npm registry, `nodejs.org/dist/index.json`, `releases.electronjs.org/releases.json`, and the better-sqlite3 npm package itself.

| Tool | Version | Installed now? | Note |
|---|---|---|---|
| Node (this Mac) | 26.3.0 | Yes | Current LTS is 26.13.1. Latest is a 27 alpha, not used |
| npm (this Mac) | 12.0.2 | Yes | |
| Electron | 45.4.1 (2026-11-18) | Yes, pinned exactly | Bundles Node 24.22.3, module ABI 150 |
| electron-vite | 6.0.0 | No, at 008 | Peer: Vite 6, 7 or 8 |
| Vite | 8.3.8 | Yes | Needed by Vitest |
| TypeScript | 6.0.3 | Yes | Latest is 7.0.2, but `typescript-eslint` 8.73.0 supports only `>=4.8.4 <6.1.0`. Move to 7 when it does |
| ESLint | 10.15.0 | Yes | with `@eslint/js` 10.0.1 |
| typescript-eslint | 8.73.0 | Yes | Supports ESLint 8, 9, 10 |
| Prettier | 3.10.1 | Yes | |
| Vitest | 5.1.1 | Yes | Node 22.12, 24, or 26+ |
| @types/node | 24.19.2 | Yes | Matches Electron's Node 24, not the Mac's Node 26 |
| Zod | 4.6.7 | No, at 007 | |
| better-sqlite3 | 13.2.0 (2026-11-14) | No, at 011 | See below |
| React | 19.3.1 | No, at 020 | with `@vitejs/plugin-react` 6.3.0 |
| eslint-plugin-boundaries | 7.4.4 | No, at 003 | Peer: ESLint 6 or later |

**SQLite on Electron 45, Apple silicon.** better-sqlite3 13.2.0 is built on Node-API version 10 (`NAPI_VERSION=10` in `binding.gyp`, dependency `node-addon-api`), and its npm package ships `prebuilds/darwin-arm64.node` (checked: `Mach-O 64-bit bundle arm64`). A Node-API addon does not depend on the Electron ABI, so no native rebuild is expected. Its GitHub releases no longer carry prebuilt files. Not yet proven: loading it inside Electron 45. That is checked at spec 011. A SQLCipher-compatible build (encryption at rest) is not part of better-sqlite3, and stays open until folder 12 (`decisions/local-data-storage.md`).

**Build tool: electron-vite.** Electron Forge 8.0.1 with `@electron-forge/plugin-vite` 8.0.1 is the other choice, but Forge's own docs still mark the Vite plugin "experimental". electron-vite builds main, preload and renderer from one config, supports Vite 8, and leaves packaging free to choose at spec 013.

## Verified

- `npm install`: "added 140 packages ... found 0 vulnerabilities". One warning: npm 12 blocked the install script of `fsevents@2.3.3` (an optional macOS file watcher pulled in by Vite) because it is not in `allowScripts`. Left blocked. Tests and checks run without it.
- `npm run check`: typecheck passed, lint passed with `--max-warnings 0`, Vitest "Test Files 1 passed (1), Tests 1 passed (1)".
- `npm run format:check`: "All matched files use Prettier code style!"
- Lint rules fire. Throwaway files, linted then deleted:
  - `src/shared/throwaway-any.ts` with `export const x: any = 1;` gave `1:17 error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`.
  - `src/shared/throwaway-console.ts` with `console.log("hi")` gave `1:1 error Unexpected console statement no-console`.
  - `tools/throwaway-console.ts` with the same line gave no error.
- `git status --short --ignored`: `.env`, `node_modules/`, build output, `references/` and screenshots do not appear as untracked. `references/` (21 files) and `node_modules/` show as ignored. No `.png`, `.jpg`, `.pdf`, `.ofx`, `.qif`, `.db` or `.env` file is untracked. The only untracked `.csv` files are the UI UX Pro Max skill's public data.
- `CLAUDE.md` sections 2 and 4 now list the real versions and scripts.

Not checked: the Electron binary itself. Electron 45 downloads it the first time it runs, not at install, so it is first downloaded and run at spec 008.

## Notes

- **Fixed during the spec:** the first `.gitignore` had `references/` unanchored, which also hid `.claude/skills/ui-ux-pro-max/references/` (part of the vetted skill). Now `/references/` and `/wireframe/brain/*.png` match only at the project root. `git check-ignore` confirms `references/imagesforaccountant` is still ignored.
- `npm 12` blocks package install scripts unless allowed. Later specs that need one (better-sqlite3 needs none, see above) must approve it by name with `npm install-scripts approve <package>`, and record why.
- `context/architecture-context.md` said the boundary lint is set up at spec 002. Corrected to 003, the number after the renumbering.
- Follow-up K3 (keep `references/` out of git) is now handled by `.gitignore`. It stays open until the author checks `git status` before the first commit.
- `wireframe/brain/` holds no screenshots at present, so the wireframe git follow-up (W01 step 5) is unaffected: the HTML would be tracked, screenshots would not.
