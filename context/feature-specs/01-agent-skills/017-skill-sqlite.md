# 017: Skill: SQLite and Migrations

A skill for adding a migration, writing a repository, and testing against a throwaway database, as built in 011.

**Client sees:** nothing. Internal.

## Depends On

- 015

## Implementation

1. `.claude/skills/sqlite-and-migrations/SKILL.md`. Triggers: `src/data/`, `.sql` files, "add a table", "migration", "repository".
2. Starts with: check the installed SQLite package version and its docs for transactions and prepared statements.
3. Steps to add a table: a new migration (never edit an applied one), a repository with Zod validation, a test with `createTestDatabase()`.
4. Money columns are integers, dates are `YYYY-MM-DD` text, unique keys for anything imported, one transaction per service call.

## Check When Done

- Every path named exists. A throwaway migration and repository made by following it work, then are removed.
