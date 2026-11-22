# 002: Folder Skeleton and Path Aliases

Spec: [002](../feature-specs/00-foundations/002-folder-skeleton.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `src/shared`, `src/domain`, `src/import`, `src/data`, `src/services`, `src/google`, `src/backup`, `src/main`, `src/preload` and `src/renderer`, each with an `index.ts` that exports nothing (`export {};`).
- `tests/fixtures/README.md`: invented data only, the sample business name, and `tests/private/` (git-ignored) for any real file used in a private check.
- Path aliases `@shared/*` to `@renderer/*` in `tsconfig.json` `paths`, the only place they are defined. Vitest reads them with Vite 8's built-in `resolve.tsconfigPaths: true` (checked in `node_modules/vite/dist/node/index.d.ts`), so no alias plugin was added. The build config does not exist yet. Spec 008 turns on the same option in the electron-vite config.
- `src/shared/alias.test.ts` checks that `@shared/index` and `./index` load the same module. It replaces 001's trivial `setup.test.ts`, which was deleted.

Choice where the spec left room: `tools/` and `guides/` from "Repo Layout" were not created. They hold scripts and Markdown, not modules, so an `index.ts` would be debris, and git does not keep an empty folder. The specs that add their first file create them (the seed tool, the first guide).

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest "Test Files 1 passed (1), Tests 1 passed (1)".
- The test really uses the alias: with `tsconfigPaths: false` it failed with `Error: Cannot find package '@shared/index' imported from .../src/shared/alias.test.ts`. The setting was restored, and the test passed again.

## Notes

- `src/renderer/index.ts` is a placeholder until React arrives at spec 020.
