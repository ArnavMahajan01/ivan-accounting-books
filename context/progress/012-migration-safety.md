# 012: Pre-Migration Copy and Integrity Check

Spec: [012](../feature-specs/00-foundations/012-migration-safety.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `src/data/migrations.ts`: `runMigrations` takes an optional `beforeApplying(fromVersion)` hook. It is called once, after the applied migrations are checked and before the first new one, and only when the file already has a schema. An error from it stops the run before anything changes.
- `src/data/pre-migration-copy.ts`:
  - `copyBeforeMigrating` writes `<data folder>/pre-migration/books-<version>-<timestamp>.db`, for example `books-1-2026-11-22T06-30-43-292Z.db`, with `VACUUM INTO`.
  - `VACUUM INTO` gives one consistent file that includes anything still in the WAL file, which a plain file copy could miss. The folder is created with mode `0700`.
  - `pruneCopies` keeps the newest 5 copies and touches only files with that name pattern.
  - A failed copy returns `pre-migration-copy-failed`, and nothing is migrated.
- `src/data/database.ts`, `openStore`:
  - It passes the copy as the hook (none for `:memory:`).
  - After migrating, it runs `PRAGMA integrity_check`. Anything but the single row `ok` closes the file and returns `integrity-failed`, with SQLite's messages in the error message.
  - A file damaged so badly that SQLite throws on the first read (`SQLITE_CORRUPT`) is also returned as `integrity-failed`, never as a crash.
  - The books are never left open after a failure.
- `src/shared/kinds.ts` adds `pre-migration-copy-failed` and `integrity-failed` to `STORE_PROBLEMS`.
- `DataStatus` (bridge contract) now carries `integrity: 'ok'` for open books. The page shows "Schema version 1, integrity: ok", or the problem.
- Choice where the spec left room: the integrity check runs at every open, not only after a migration. The client's books are small, so it is quick, and damage from a crash or a disk fault is caught even when no migration runs.
- Tests: `pre-migration-copy.test.ts` (6).

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 211 passed (211)".
- Failing migration (the spec's check), on a temporary file with 300 invented rows at schema version 2:
  - Migration 3 adds a column, then fails. `openStore` returned `migration-failed` ("Migration 3-broken failed: no such table: no_such_table").
  - The books' tables, rows and schema version are exactly as before.
  - `pre-migration/books-2-2026-11-22T06-30-43-292Z.db` exists and holds the same tables and rows.
- No copy is made for a new file, or when no migration is waiting.
- Seven copies plus an unrelated `notes.txt` were pruned to the newest five plus `notes.txt`.
- Integrity:
  - Sound books open.
  - Books with four bytes of row data changed open in SQLite, but `integrity_check` reports "row ... missing from index". `openStore` refused them with `integrity-failed` and that message.
  - Books with a damaged page header make SQLite throw `SQLITE_CORRUPT` ("database disk image is malformed", checked separately), and `openStore` refused them with `integrity-failed`.
- The built app (Playwright): the page shows "Accounting Books / Version 0.0.0, development / Schema version 1, integrity: ok". The development books had no waiting migration, so no `pre-migration` folder was made.

Not checked in the real app: a copy made by an actual migration. That would need a throwaway migration applied to the development books, which then could not be removed without hand repair. The unit tests use real files in a temporary folder instead.

## Notes

- A first attempt at the damage test changed row bytes on a table with no index. `integrity_check` said `ok`, because it checks structure, not the contents of a row. The test now uses an index, so the table and index disagree, and tries pages in turn until SQLite reports the problem. The data is fixed, so the same page is found every run.
- Restoring from a copy is not built here. Backups and restore are folder 11.
