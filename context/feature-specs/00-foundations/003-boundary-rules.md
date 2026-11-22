# 003: Import Boundary and Purity Lint Rules

Makes the import directions between folders, and the purity of `domain` and `import`, a lint error, so a wrong import fails `npm run check` instead of slipping through review.

**Client sees:** nothing. Internal.

## Depends On

- 002

## Implementation

1. A lint rule for the allowed directions in `architecture-context.md` ("System Boundaries"). Check the current version of `eslint-plugin-boundaries` first. If it does not work with the installed ESLint, pick an equal tool and record why.
2. Purity rules: `src/domain` and `src/import` may not import `fs`, `path`, `electron`, the SQLite package or any network module, and may not use `Date.now`, `new Date()` with no argument, or `Math.random`.
3. `src/renderer` may import only `@shared` and the bridge types.
4. Prove each rule fires: add a throwaway file with one forbidden import, run `npm run lint`, record the command and output in the progress file, delete the file.

## Scope Limits

- Never loosen a boundary to make code compile. Change the design, or ask.

## Check When Done

- An import of `@data/...` from `src/domain/` fails lint with the boundary message. So do `Math.random()` in `src/import/` and `electron` in `src/renderer/`.
- An import of `@shared/...` from `src/domain/` passes.
- `npm run check` passes.
