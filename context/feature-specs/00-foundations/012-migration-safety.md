# 012: Pre-Migration Copy and Integrity Check

Copies the books before any migration and checks the file after, so a failed update can never lose the books (risk L4).

**Client sees:** nothing. Internal.

## Depends On

- 011

## Implementation

1. Before applying a migration to a file with data, copy it to `<data folder>/pre-migration/books-<version>-<timestamp>.db`. Keep the last 5.
2. After migrating, run `PRAGMA integrity_check`. On failure, stop with a plain message and do not open the books.
3. `app.getDataStatus` adds "integrity: ok" or the problem. The page shows it.

## Check When Done

- A test applies a failing migration: the file is unchanged and the copy exists.
- The page shows "integrity: ok".
- `npm run check` passes.
