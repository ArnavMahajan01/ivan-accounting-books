# 014: Package Contents Check and First End-to-End Test

Fails the build if private or development files get into the app, and adds the first test that launches the packaged app (risk B2).

**Client sees:** nothing. Internal.

## Depends On

- 013

## Implementation

1. A build check that fails if the developer's home path appears in any packaged file, or if `.env`, `tests/`, `tools/`, `references/` or `wireframe/` are inside the package.
2. A Playwright test that launches the packaged app with a throwaway data folder and checks the page shows the version and "integrity: ok". Script `npm run test:e2e`, listed in `code-standards.md`.

## Check When Done

- The check fails when a file containing the home path is added, and passes once removed.
- `npm run test:e2e` passes. `npm run check` passes.
