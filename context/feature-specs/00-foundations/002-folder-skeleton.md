# 002: Folder Skeleton and Path Aliases

Creates the folders from `architecture-context.md` ("Repo Layout") with path aliases, so later specs put code in the agreed place.

**Client sees:** nothing. Internal.

## Depends On

- 001

## Implementation

1. Create each folder in `architecture-context.md` ("Repo Layout") with an `index.ts` that exports nothing yet.
2. `tests/fixtures/README.md`: fixtures are invented data only, never a real bank file, name or amount.
3. Path aliases in `tsconfig.json` and the build and test configs: `@shared/*`, `@domain/*`, `@import/*`, `@data/*`, `@services/*`, `@google/*`, `@backup/*`, `@main/*`, `@preload/*`, `@renderer/*`.

## Scope Limits

- No import rules yet (003). No helpers (004 onwards).

## Check When Done

- A test file importing `@shared/index` through its alias runs under Vitest.
- `npm run check` passes.
