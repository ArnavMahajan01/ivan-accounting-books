# 001: Initialize the Repository and Tooling

Creates the project with strict TypeScript, lint, format, tests and one `check` command, so every later spec passes the same checks. No app code.

**Client sees:** nothing. Internal.

## Decide First

- `decisions/desktop-shell.md` is decided. This spec assumes Electron. If another shell is chosen, rewrite this spec first.
- `decisions/local-data-storage.md` is decided, so the native SQLite build can be checked here.
- W11 (wireframe sign-off) is done.

## Implementation

1. Give the author the commands to create the repository, and wait until they confirm: `git init`, then `git checkout -b feature/00-foundations`. Do not run them yourself.
2. Check the current stable versions of Node, Electron, Vite, the Electron build tool, TypeScript, ESLint, Prettier, Vitest and Zod on their official sites, and the chosen SQLite package's support for that Electron version on Apple silicon. Record each version and the date in this spec's progress file. Pick the build tool (for example electron-vite, or Electron Forge with Vite) from its current docs, and record why.
3. Create `package.json` with the scripts in `code-standards.md` ("Scripts"): `dev`, `build`, `package`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:watch`, `check`. `dev`, `build` and `package` may print "not built yet" until 008 and 013. Pin Electron to an exact version.
4. `tsconfig.json` with `strict` and `noUncheckedIndexedAccess`. ESLint bans `any` and bare `console` (outside `tools/`). Prettier config. Vitest finds `*.test.ts` next to the code.
5. `.gitignore`: at least `node_modules/`, `out/`, `dist/`, `release/`, `.env`, `*.db`, `*.sqlite`, `tests/private/`, `.DS_Store`, `references/`, `wireframe/brain/*.png` (risk K3: real client screenshots never enter git). `.env.example` with placeholders only. One trivial test.

## Scope Limits

- No `src/` folders beyond what the tools need (002).
- No Electron window (008). No SQLite (011).
- No CI service, and no kit hooks unless the author asks.

## Check When Done

- `npm install` finishes with no errors. Warnings are listed in the progress file.
- `npm run check` runs typecheck, lint and test, and passes with at least one test.
- A file with `const x: any = 1` fails `npm run lint`. Remove it after checking.
- `git status` shows no `.env`, `node_modules`, build output, `references/` or screenshots as untracked.
- `CLAUDE.md` sections 2 and 4 list the real versions and scripts.
