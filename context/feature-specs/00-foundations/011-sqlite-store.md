# 011: SQLite Store and Migration Runner

Opens the books file and applies numbered migrations safely, so every later table is added the same careful way.

**Client sees:** nothing. Internal.

## Depends On

- 010
- `decisions/local-data-storage.md` decided

## Implementation

1. `src/data/database.ts`: open `<data folder>/books.db` (or the encrypted variant, if decided), foreign keys on, WAL mode. Only the main process opens it.
2. `src/data/migrations/`: a runner that applies numbered `.sql` files in order, one transaction each, recorded in `schema_migrations` with a content hash. It refuses to start if an applied migration changed. `0001-init.sql` creates `schema_migrations` and `app_meta` (schema version).
3. `createTestDatabase()`: a throwaway database from the real migrations, for every later service test.
4. Bridge function `app.getDataStatus`: schema version. The page shows it.

## Scope Limits

- No ledger tables (030 onwards). No backups (folder 11).

## Check When Done

- First launch creates `books.db` in the development folder, and the page shows schema version 1.
- Editing an applied migration's text makes the runner refuse to start, with a clear error.
- No test touches the real data folder.
- `npm run check` passes.
