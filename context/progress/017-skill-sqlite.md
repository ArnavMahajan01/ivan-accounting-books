# 017: Skill: SQLite and Migrations

Spec: [017](../feature-specs/01-agent-skills/017-skill-sqlite.md)
Status: Done
Date: 2026-11-22
Branch: feature/01-agent-skills

## What was done

- Read better-sqlite3's API docs at the installed tag (`v13.2.0/docs/api.md`): `transaction` (nesting as savepoints, the `deferred`, `immediate` and `exclusive` variants, no async functions, SQLite's own rollbacks), `prepare`, `run`, binding parameters and the type mapping.
- `.claude/skills/sqlite-and-migrations/SKILL.md`:
  - **Triggers:** `src/data/`, `.sql` files, "add a table", "migration", "repository", "schema", "query", database errors.
  - **It starts with:** check the installed version (13.2.0, SQLite 3.54.1) and its docs.
  - **"Add a table" in five steps:**
    - a new numbered migration, never editing an applied one, `STRICT` tables;
    - column rules: integer `_cents`, `YYYY-MM-DD` text `_date` with a `CHECK`, UTC `_at`, `newId` text ids, `CHECK` lists for kinds, `REFERENCES`, `UNIQUE` keys for imported rows, last four digits only for account numbers;
    - a repository with prepared statements and Zod on every row;
    - a test with `createTestDatabase()`;
    - the check.
  - **Transactions:** one per service call, synchronous only, savepoints, no raw `BEGIN`.
  - **The rest:** settings in use, what changed in version 13, common mistakes, testing, what each `STORE_PROBLEMS` code means and what to do, and `## Links`.
- `.claude/skills/README.md`: a row for it.

## Verified

- Every project path in the skill exists, 15 checked. The four strings that look like paths but are not:
  - `21/11/2026`, a date format to avoid;
  - `@types/better-sqlite3`, a package;
  - `docs/api.md`, in the better-sqlite3 repository, linked;
  - `pre-migration/`, made in the data folder at run time.
- Every function it names exists: `openStore`, `bundledMigrations`, `createTestDatabase`, `migrationsFromFiles`, `runMigrations`, `asCents`, `parseCalendarDate`, `newId`, `ID_KINDS`.
- "Add a table" was followed for a throwaway: `0002-sample-notes.sql`, `sample-notes-repository.ts` (insert with `ON CONFLICT (import_key) DO NOTHING`, list with Zod), and a test on `createTestDatabase()`.
  - The test passed: schema version 2, the value read back as `Cents` and `CalendarDate`, a second insert with the same import key ignored, `'21/11/2026'` refused by the `CHECK`, and `12.5` refused by the `STRICT` integer column.
  - All three files were removed afterwards. `src/data/migrations/` holds only `0001-init.sql`.
- After removal: `npm run check` "Tests 225 passed (225)". `npm run test:e2e` "2 passed".
- This session's skill list picked up `sqlite-and-migrations`.

## Notes

- **Found by following the skill, and fixed:** adding the throwaway `0002` made 14 existing tests fail. They were tests from specs 011 and 012, which would have failed the same way at spec 030, the first real table. There were two causes:
  - They expected "schema version 1" exactly.
  - Their invented test migrations were numbered `0002` and `0003`, which collide with real ones (`duplicate-migration-version`).
  - Now the expected version is read from the real migration list (`latest()`, `latestVersion()`, `createTestDatabase().schemaVersion`), and invented migrations are numbered from 9001.
  - The end-to-end test accepts any schema version followed by ", integrity: ok".
  - Changed: `src/data/migrations.test.ts`, `src/data/database.test.ts`, `src/data/pre-migration-copy.test.ts`, `src/main/bridge.test.ts`, `tests/e2e/packaged-app.spec.ts`. No test was weakened: each still checks the same behaviour, against the real latest version instead of a fixed number.
- The finished progress records for 011 and 012 still quote the old numbers (for example `books-2-...db`). They describe what was run at the time, and finished records are not edited.
