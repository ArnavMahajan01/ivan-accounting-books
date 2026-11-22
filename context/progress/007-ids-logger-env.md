# 007: Ids, Logger and Environment

Spec: [007](../feature-specs/00-foundations/007-ids-logger-env.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- Installed Zod 4.6.7 (pinned exactly, a production dependency).
- `src/shared/kinds.ts`: `ID_KINDS` (`acc`, `ent`, `lin`, `stl`, `imp`) and `IdKind`.
- `src/shared/ids.ts`:
  - `newId(kind, random)` gives `acc_` plus 16 characters of lower-case Crockford base32 (no i, l, o or u), 80 random bits. The 32 symbols divide 256 exactly, so each is equally likely.
  - `Id<K>` is the type `` `${K}_${string}` ``.
  - `RandomSource` is the interface, and `seededRandom(seed)` (mulberry32) gives the same bytes for the same seed, for tests and sample data.
- `src/main/random.ts`: `systemRandom` uses `crypto.getRandomValues`. It sits in `main`, like the clock (006), so `domain` and `import` cannot reach it.
- `src/shared/logger.ts`: `createLogger(scope, sink?)` with `info`, `warn` and `error(event, fields)`. It throws `PrivateLogFieldError`, writing nothing, if:
  - a field name contains `description`, `amount`, `name`, `email`, `payee` or `token`, in any case, so `payeeName` and `amountCents` are caught too;
  - a string value, the scope or the event is not a short code (letters, digits, `_ . : -`, no spaces), so free text such as a bank description cannot be logged under an innocent field name;
  - a number is not finite.
  - The default sink writes one JSON line to the console. Spec 010 adds the log file sink.
- `src/shared/env.ts`: `loadEnv()` checks `process.env` against `envSchema`, which is empty because no variable is read yet. `parseEnv(schema, source)` does the work and returns `invalid-env` with each problem's variable name and `missing` or `invalid`, never the value. `.env.example` says no variables are read yet.
- `eslint.config.js`: `no-console` is off for `src/shared/logger.ts` only, the one place in `src/` that prints.
- `code-standards.md` ("Ids") names `seededRandom`, `systemRandom` and `systemClock`.

Choices where the spec left room:
- The private-word check matches inside longer names. It also refuses `fileName`, which is right: file names from the client's folders are private too (`security-context.md`).
- The string-value rule goes beyond the spec, which lists field names only. Without it, `{ code: 'EFTPOS PURCHASE ...' }` would pass.
- Breaking a logging rule throws, because it is a bug in the caller, not an expected failure.

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest "Test Files 10 passed (10), Tests 149 passed (149)".
- `logger.info("x", { description: "a" })` throws `PrivateLogFieldError` and writes no record (test). Each of the six words is refused, alone and inside a longer name in upper case (12 cases).
- `parseEnv` with the required `SAMPLE_CLIENT_ID` missing returns `{ code: 'invalid-env', problems: [{ variable: 'SAMPLE_CLIENT_ID', problem: 'missing' }] }`. An invalid value is named without its value appearing anywhere in the result.
- The same seed gives the same ids. 10,000 ids from one source are all different. Over 32,000 characters, all 32 symbols appear, each more than 850 times.
- `console.log` in another `src/shared` file still fails lint (`no-console`).

## Notes

- `loadEnv()` has no real variable to check until folder 09 adds the OAuth client id, so "a missing variable returns an error naming it" is tested with a sample schema through `parseEnv`, the same code path.
