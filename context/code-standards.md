# Code Standards

The project's own implementation rules. The general rules are in `context/rules/code-rules.md`. This file holds only what is specific to this stack and these folders. Written on 2026-11-21, before any code. Each rule names the file or tool it is about, and those files are created by the specs named. Update this file in the same change that creates or changes them.

## General

- Keep modules small and single-purpose.
- Fix root causes. Do not layer workarounds on top of them.
- Do not mix unrelated concerns in one module, component or bridge handler.
- Respect the system boundaries and invariants in `architecture-context.md`.
- Name files in kebab-case, after what they are responsible for: `gst-maths.ts`, `westpac-csv-parser.ts`, `post-journal.ts`.

## TypeScript

- `strict` and `noUncheckedIndexedAccess` on, in `tsconfig.json` (spec 001). Never loosened.
- No `any`. Use `unknown` plus Zod for untrusted input.
- `interface` for object contracts, `type` for unions.
- No magic strings for statuses or kinds. Use literal unions from `src/shared/kinds.ts` (spec 004), such as `AccountType`, `StatementLineStatus` and `ShareRole`. Every `switch` over one ends with `default: return assertNever(value)` from the same file.
- Expected failures return `Result<T, E>` from `src/shared/result.ts` (spec 004). Throw only for real bugs.
- Validate outside input at each boundary: bridge calls (in `src/main/`), bank files (in `src/import/`), rows read from SQLite (in `src/data/`), Google responses (in `src/google/`), backup files, and environment variables.
- Read environment variables only through `loadEnv()` in `src/shared/env.ts`.
- Log only through `createLogger(scope)` in `src/shared/logger.ts`. A bare `console` call is a lint error outside `tools/`.
- Import across folders with path aliases (`@shared/*`, `@domain/*` and so on, spec 002). Boundaries are enforced by the lint rule set up at spec 003.

## Money

- Amounts are integer cents in AUD, typed as `Cents` (a branded `number`) from `src/shared/money.ts`. Never a float, never a string in the domain.
- Parse text to cents only with `parseCents()`, which reads the digits and never goes through a float. `"12.3"`, `"-1,234.50"` and `"(45.00)"` are handled by tests.
- Format only with `formatCents()`, using `en-AU` and the `AUD` currency.
- Sums use plain integer addition. Check the result stays within `Number.MAX_SAFE_INTEGER`.
- Rounding happens only in the GST helpers, and the rule is written in their doc comment and tested.

## GST

- The rate lives in one constant in `src/domain/gst.ts` (spec 035).
- GST inside a GST-inclusive amount is one eleventh, worked out in cents with a single, tested rounding rule. GST added to an exclusive amount is 10%.
- Tax codes are data in the `tax_code` table, with the BAS label each feeds. Code never branches on a code's name.
- Every ATO fact used (rates, BAS labels, simpler BAS) is checked against ato.gov.au at the spec that uses it, with the date recorded in that spec's progress file.

## Dates

- Calendar dates are `YYYY-MM-DD` strings, typed as `CalendarDate` from `src/shared/dates.ts`. Timestamps are UTC ISO strings, typed as `Timestamp`.
- The domain never creates a `Date` from a calendar date, because Australia is ahead of UTC and the day can shift.
- Bank dates are parsed with an explicit day-first format. Never `new Date(text)`.
- The financial year runs 1 July to 30 June. `financialYearOf(date)` and `basPeriodOf(date, frequency)` in `src/domain/periods.ts` (spec 031) are the only place this is worked out.
- The current time comes from a `Clock` passed in, never `Date.now()` inside `domain` or `import`.

## Ids

- Stable string ids with a kind prefix: `acc_`, `ent_`, `lin_`, `stl_`, `imp_`. They are built by `newId(kind)` in `src/shared/ids.ts`, which takes its random source as an argument so tests are repeatable.
- Never use an array position or a row number as an id.

## Data (`src/data/`)

- One SQLite connection, opened by the main process, with foreign keys on and the WAL journal mode.
- Every schema change is a new numbered migration in `src/data/migrations/`, such as `0003-add-rules.sql`. An applied migration is never edited.
- Before migrating, the store copies the file to `<data folder>/pre-migration/`. After migrating, it runs an integrity check.
- Repositories take and return typed objects, validated with Zod when read. No SQL outside `src/data/`.
- Writes that may repeat use unique keys and upserts.

## Services (`src/services/`)

- One file per use case, named for it: `import-statement.ts`, `post-journal.ts`, `accept-accountant-change.ts`.
- Each runs inside one transaction, and either everything is saved or nothing is.
- `post-journal.ts` is the only writer of `journal_entry` and `journal_line`. It checks the entry balances, checks the lock date, and writes the audit log row.

## Bridge (`src/main/` and `src/preload/`)

- The bridge contract lives in `src/shared/bridge-contract.ts`: each function's name, input schema and result type.
- Each handler validates its input with that schema, calls one service, and returns a `Result`. No handler runs SQL or calls Google directly.
- No general functions such as "run query" or "read file at path". Named, narrow functions only.

## Bank Importers (`src/import/`)

- Each format implements one interface: `detect(text): boolean` and `parse(text): Result<StatementFile, ImportError[]>`.
- Importers are listed in one registry, `src/import/registry.ts`. A new bank is a new file plus a registry line, never an `if` elsewhere.
- Parsers never see file paths, and never throw on bad rows. Each rejected row is reported with its row number and reason.

## Google (`src/google/`, folder 09)

- The only folder that calls Google. Every call has a timeout, and retries with backoff only when the call is safe to repeat.
- Values are always written with `valueInputOption: RAW`.
- Tokens never leave this folder in plain text, apart from the encrypted file on disk.

## Styling (`src/renderer/`)

- Tokens only, from `src/renderer/styles/tokens.css`. No raw colour values in components.
- Radius: controls 8, cards and tables 12, dialogs 16, badges full.
- Amounts are always shown with the shared `Amount` component.
- Every screen handles loading, empty and error states.

## Testing

- Vitest. Tests live next to the code as `*.test.ts`.
- Must ship with tests: everything in `src/shared`, `src/domain`, `src/import` and `src/services`, and every migration.
- Service tests use a throwaway SQLite file built from the real migrations.
- Google calls are mocked in tests. Tests never reach Google, and never use the real data folder.
- Fixtures in `tests/fixtures/` are invented: invented business, invented descriptions, invented amounts. A bank file fixture copies the real format, never real content.
- A spec that changes visible UI also lists its manual check in "Check When Done".

## Dependencies

- Before adding one, check that it is maintained, supports the installed versions, is licensed for this use, and is not already covered.
- One library per job.
- Pin exact versions for Electron, SQLite bindings, the encryption library and anything handling tokens.
- Nothing paid or metered without the author's decision.

## Docs And Guides

- A change is not finished until the matching guide in `guides/` is updated, in the same change.
- Link to files by path, and name functions by name. Never use line numbers.

## Scripts

Created at spec 001. Names follow `context/rules/code-rules.md`.

- `npm run dev`: the app in development, using the `Dev` app name and data folder.
- `npm run build`: production build of main, preload and renderer.
- `npm run package`: the packaged `.app`.
- `npm run typecheck`, `npm run lint`, `npm test`.
- `npm run format` / `npm run format:check`.
- `npm run check`: typecheck, lint and test in sequence.

Later specs add to this list. Add each new script here in the same change that creates it.
