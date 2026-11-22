---
name: sqlite-and-migrations
description: SQLite in Accounting Books with better-sqlite3 - adding a table through a new numbered migration, writing a repository that validates its rows with Zod, testing against a throwaway database, and transactions. Use when editing src/data/ or any .sql file, or when the task says "add a table", "migration", "repository", "schema", "query", or a database error appears.
---

# SQLite and Migrations in Accounting Books

First check the installed version in `node_modules/better-sqlite3/package.json` (13.2.0 when this was written, SQLite 3.54.1) and read its API docs for that tag (`docs/api.md`, linked below) for `transaction`, `prepare`, `run`, `get` and `all`. Do not rely on memory.

`context/architecture-context.md` (the data layer and its invariants) and `context/code-standards.md` win over this skill.

## Where it is used

- `src/data/` only. It is the one folder that may import `better-sqlite3` (lint rule, spec 003). Only the main process opens the books.
- `src/data/database.ts`: `openStore(path, migrations, now)` opens the file, turns on foreign keys and WAL, copies the file before migrating (`pre-migration-copy.ts`), applies migrations, and runs `PRAGMA integrity_check`. It returns `Result<Store, OpenError>`. `bundledMigrations()` loads the SQL files into the build.
- `src/data/migrations.ts`: the runner. `src/data/migrations/NNNN-name.sql`: the migrations.
- `src/data/test-database.ts`: `createTestDatabase()`, an in-memory database from the real migrations.
- The file: `<data folder>/books.db` (` Dev` folder in development), with `-wal` and `-shm` beside it.
- `services` reach the data through repositories. `domain`, `import`, `renderer` and `google` never touch SQLite.

## Add a table

1. **A new migration file.** `src/data/migrations/0002-add-accounts.sql`: the next free four-digit number, lower-case words joined by `-`.
   - **Never edit an applied migration**, not even a comment. The runner stores each file's SHA-256 and refuses to open the books if one changed (`applied-migration-changed`). A fix is a new migration.
   - One migration is one transaction. Do not write `BEGIN` or `COMMIT` in the file.
   - Make every table `STRICT`, so SQLite refuses a value of the wrong type.
2. **Columns:**
   - Money: `INTEGER NOT NULL`, in cents, named `..._cents` (`amount_cents`). Never `REAL`.
   - Calendar dates: `TEXT` in `YYYY-MM-DD`, named `..._date`, with `CHECK (x_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`. Moments: `TEXT`, a UTC ISO `Timestamp`, named `..._at`.
   - Ids: `TEXT PRIMARY KEY`, made by `newId(kind, random)`, with the kind added to `ID_KINDS` in `src/shared/kinds.ts`. Never `AUTOINCREMENT` or a row number as an id.
   - Kinds and statuses: `TEXT` with a `CHECK (status IN (...))` matching the union in `src/shared/kinds.ts`.
   - Links: `REFERENCES other(id)`. Foreign keys are on.
   - Anything imported from a bank file gets a `UNIQUE` key, so the same file twice adds nothing (invariant 4).
   - Bank account numbers: only the last four digits (`security-context.md`).
3. **A repository**, for example `src/data/accounts-repository.ts`:
   - Plain functions that take the `Database` and return typed values.
   - Prepared statements with `?` or `@name` parameters, never SQL built from strings.
   - Every row read back is checked with a Zod schema before it is trusted (`code-standards.md`). Turn cents into `Cents` with `asCents`, and dates into `CalendarDate` with `parseCalendarDate(text, 'YYYY-MM-DD')`.
   - No business rules here. They live in `src/domain/`.
4. **A test** next to it (`accounts-repository.test.ts`), using `createTestDatabase()`. Never a file in the data folder.
5. **Check:** `npm run check`. The migration list test in `src/data/migrations.test.ts` runs every bundled migration on an empty database.

```ts
// The shape of a repository function: a prepared statement, then Zod on what comes back.
const rowSchema = z.object({ id: z.string(), name: z.string(), balance_cents: z.number().int() });

export function listAccounts(db: Database.Database): Account[] {
  const rows = db.prepare('SELECT id, name, balance_cents FROM accounts ORDER BY name').all();
  return z.array(rowSchema).parse(rows).map((r) => ({ id: r.id, name: r.name, balance: asCents(r.balance_cents) }));
}
```

## Transactions

- **One transaction per service call.** A service in `src/services/` wraps its whole job in `db.transaction(() => { ... })()`. Either all of it is written, or none of it.
- The posting service is the only writer of journal entries and lines, and writes the audit row in the same transaction (invariant 3, spec 039 onward).
- Transaction functions must be synchronous. An `async` function commits at its first `await` (better-sqlite3 docs, "Caveats"). Do the slow or outside work (reading a file, calling Google) before or after the transaction, never inside it.
- A transaction function called inside another becomes a savepoint. An error thrown inside rolls back to it, and rethrown, rolls back the outer one too.
- Never write raw `BEGIN`, `COMMIT` or `ROLLBACK` inside a transaction function.
- If an SQLite error is caught inside a transaction, check `db.inTransaction` and rethrow if it is false. SQLite may have rolled back already.

## Settings in use

- `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` (not WAL for `:memory:`), set in `openStore`.
- `app_meta.schema_version` holds the last applied migration. `schema_migrations` holds each one's version, name, SHA-256 and `applied_at`.
- Before migrating a file that already has a schema, `VACUUM INTO` writes `pre-migration/books-<version>-<time>.db`, keeping the newest 5. `VACUUM INTO` includes the WAL contents, which copying `books.db` alone could miss.
- The integrity check runs on every open. A damaged file is returned as `integrity-failed` and not opened.
- better-sqlite3 13 is a Node-API module with a prebuilt Apple-silicon binary. It needs no rebuild for Electron. Its install script is denied in `package.json` (`allowScripts`).

## Things that changed in this version

- better-sqlite3 13 moved to Node-API: one prebuilt binary works across Node and Electron. There is no more `prebuild-install` and no `electron-rebuild` step.
- 13.2.0 loads a locally compiled binary before the prebuilt one. Nothing is compiled here, so the prebuilt one is used.
- `@types/better-sqlite3` is still at 9.6.0. The JavaScript API has not changed since 9.
- SQLite `STRICT` tables (3.37 and later) are available. Use them.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Editing `0001-init.sql` to add a column | A new migration, `0002-...` |
| `REAL` or a float for money | `INTEGER` cents, through `src/shared/money.ts` |
| Storing a `Date` or a local date string such as `21/11/2026` | `YYYY-MM-DD` text for days, UTC ISO for moments |
| Trusting `.get()` or `.all()` results as typed | A Zod schema on every row |
| SQL built with template strings | Bound parameters |
| `await` inside `db.transaction` | Synchronous work only; outside work before or after |
| A test opening `books.db` in the data folder | `createTestDatabase()`, or a temporary folder for file tests |
| A business rule in a repository | `src/domain/`, called from the service |
| `INSERT` into journal tables outside the posting service | Call the posting service |

## Testing

- `createTestDatabase()` gives a fresh in-memory database from the real migrations, for every repository and service test. Close it with `store.close()` when a test opens many.
- File behaviour (WAL, the pre-migration copy, damage) is tested with `mkdtempSync(join(tmpdir(), '...'))` and `openStore`, as in `src/data/database.test.ts` and `src/data/pre-migration-copy.test.ts`.
- To test a migration that is not real, build the list with `migrationsFromFiles({ 'm/0002-x.sql': '...' })` and pass it to `openStore` or `runMigrations`.

## When it goes wrong

- **"The books could not be opened (applied-migration-changed)":** an applied migration file was edited. Restore it from git, and put the change in a new migration.
- **`applied-migration-missing`:** a migration the books already have was deleted or renamed. Restore it.
- **`migration-failed`:** the new migration's SQL failed. Nothing was applied (it rolled back), and the copy is in `pre-migration/`. Fix the new file.
- **`integrity-failed`:** the file is damaged. Do not open it with other tools in place. Restore from `pre-migration/` or a backup (folder 11).
- **`SQLITE_BUSY`:** something else holds the file, often a second process. The app takes a single-instance lock. Look for a stray process.
- **`cannot-open`:** the folder is missing or not writable.

## Links

- [better-sqlite3 API (v13.2.0)](https://github.com/WiseLibs/better-sqlite3/blob/v13.2.0/docs/api.md)
- [better-sqlite3 releases](https://github.com/WiseLibs/better-sqlite3/releases)
- [SQLite STRICT tables](https://www.sqlite.org/stricttables.html)
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and [savepoints](https://www.sqlite.org/lang_savepoint.html)
- [SQLite WAL mode](https://www.sqlite.org/wal.html), [VACUUM INTO](https://www.sqlite.org/lang_vacuum.html#vacuuminto) and [PRAGMA integrity_check](https://www.sqlite.org/pragma.html#pragma_integrity_check)
