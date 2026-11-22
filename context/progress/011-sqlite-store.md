# 011: SQLite Store and Migration Runner

Spec: [011](../feature-specs/00-foundations/011-sqlite-store.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- Installed `better-sqlite3` 13.2.0 (production, pinned) and `@types/better-sqlite3` 9.6.0.
  - The release notes for 10 to 13 change only the supported Node and Electron versions, plus 13's move to N-API, not the JavaScript API, so the types fit.
  - Its default install script (`node-gyp rebuild`) is denied in `package.json` `allowScripts`, because the package ships a prebuilt arm64 binary. `fsevents` is denied the same way, closing the 001 follow-up.
- `src/data/migrations/0001-init.sql`: `schema_migrations` (version, name, sha256, applied_at) and `app_meta` (key, value), both `STRICT` tables.
- `src/data/migrations.ts`:
  - `migrationsFromFiles` checks names (`0002-add-accounts.sql`) and unique numbers, and sorts them.
  - `runMigrations` first checks every applied migration still has its file, with the same SHA-256. Otherwise it returns `applied-migration-changed` or `applied-migration-missing`, with a plain message, and applies nothing.
  - Then it applies each new migration in its own transaction, together with its `schema_migrations` row and `app_meta.schema_version`. A failure rolls the whole migration back (`migration-failed`).
  - `schemaVersion(db)` reads `app_meta.schema_version`.
- `src/data/database.ts`:
  - `bundledMigrations()` loads `migrations/*.sql` with Vite's `import.meta.glob`, so the SQL is built into the main bundle and the packaged app cannot miss a file.
  - `openStore(path, migrations, now)` opens the file, turns on foreign keys and WAL, and migrates. It returns `Result<Store, OpenError>`, with `cannot-open` if the file cannot be opened.
- `src/data/test-database.ts`: `createTestDatabase()`, an in-memory database from the real migrations.
- `src/shared/kinds.ts`: `STORE_PROBLEMS`, the codes both the data layer and the page use.
- Bridge function `app.getDataStatus` (contract, handler and the `dataStatus` service in `src/services/data-status.ts`) gives the schema version, or the problem.
  - The page shows "Schema version 1", or "The books could not be opened (code)" as an alert.
  - `App.tsx` now uses one small `useBridge` helper for both calls.
- `src/main/index.ts`:
  - It opens `<data folder>/books.db` after the app is ready.
  - It logs `books.opened` with the schema version, or `books.not-opened` with only the code (the message can name a file).
  - It closes the database on quit.
- `tsconfig.json` adds the `vite/client` types for `import.meta.glob`.
- Tests: `migrations.test.ts` (12), `database.test.ts` (4), and two more in `bridge.test.ts`.

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 204 passed (204)".
- better-sqlite3 loads with no rebuild: in Node 26.3.0 (SQLite 3.54.1), and inside Electron 45.4.1, because the built app opened and migrated the books.
- First launch of the built app (Playwright):
  - `books.db` did not exist in `~/Library/Application Support/Accounting Books Dev`. Afterwards it did (16 KB).
  - The page showed "Schema version 1".
  - The file holds `schema_migrations` `[{ version: 1, name: "init", applied_at: "2026-11-22T06:30:43.292Z" }]` and `app_meta` `schema_version = 1`, with journal mode `wal`.
- Edited migration: the stored hash of migration 1 in that development file was changed, which has the same effect as editing the applied migration.
  - On the next launch the page showed "The books could not be opened (applied-migration-changed)." as an alert, and the log held only `{"event":"books.not-opened","fields":{"code":"applied-migration-changed"}}`.
  - The correct hash was then put back, and the next launch showed "Schema version 1" again.
- Unit tests:
  - An edited migration 1 gives the message "Migration 1-init was changed after it was applied. Restore it and add a new migration instead".
  - A missing applied file is refused.
  - A failing migration leaves no half-made table and no record.
  - A second run applies nothing, and a new migration applies alone.
- No test touches the real data folder. Tests use `:memory:` or a temporary folder. A search of the test files finds only one sample path string, in a pure function's test.

## Notes

- **File permissions:** `books.db` is created with the default permissions (`-rw-r--r--`), so another user account on the same Mac could read it. The data folder is in the user's Library, but this matters for private books. A tracker follow-up raises it for the encryption decision (folder 12). It was not changed here, as the spec does not ask for it.
- The page's text is a placeholder until the design arrives at spec 020.
