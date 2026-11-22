# 007: Ids, Logger and Environment

Adds id creation with an injected random source, a logger that refuses private fields, and validated environment settings.

**Client sees:** nothing. Internal.

## Depends On

- 004

## Implementation

1. `src/shared/ids.ts`: `newId(kind, random)` gives ids such as `acc_` plus random characters. Tests use a seeded source and get the same ids every run.
2. `src/shared/logger.ts`: `createLogger(scope)` with `info`, `warn`, `error`, taking an event name and a small record of ids and counts. It throws when given a field named `description`, `amount`, `name`, `email`, `payee` or `token` (`security-context.md`).
3. `src/shared/env.ts`: `loadEnv()` validates the variables in `.env.example` with Zod.

## Scope Limits

- The logger writes to the console. The log file comes in 010.

## Check When Done

- A test calling `logger.info("x", { description: "a" })` fails as expected.
- `loadEnv()` with a missing variable returns an error naming it.
- `npm run check` passes.
