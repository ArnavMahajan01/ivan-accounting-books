---
name: check-invariants
description: Audit the Accounting Books code against its ten invariants and import boundaries. Use after changing anything in src/ or tools/, before finishing a spec, or when the author asks to "check invariants", "check boundaries" or "is the architecture still clean".
---

# Check the Invariants

The invariants are in `context/architecture-context.md` ("Invariants") and the boundaries in "System Boundaries". Re-read both first. They win over this file. Run everything from the project root.

## 1. The lint rules

```bash
npm run lint
```

This enforces, as errors (spec 003, 005, `eslint.config.js`):
- the import directions;
- purity of `src/domain` and `src/import` (no Node modules, network, `Date.now`, `new Date()`, `Math.random`);
- `electron` only in `main` and `preload`;
- `better-sqlite3` only in `data`;
- no `parseFloat` or `toFixed` in `domain`, `import`, `services` or `money.ts`;
- no `any`;
- no bare `console` outside `tools/` and the logger.

A clean lint covers most of invariants 2, 7 and 8.

## 2. One check per invariant

Each search prints nothing on a pass, unless an expected hit is named. Hits in `*.test.ts` files that are clearly test-only are allowed. Quote `--include` patterns, because zsh expands them.

**1. Every journal entry's lines sum to zero cents.** `npm test` runs the entry validation tests (`src/domain/journal.test.ts`), the posting tests that refuse an unbalanced entry and roll back a failure halfway (`src/services/post-journal.test.ts`), the trial balance tests, and the books check tests that find a corrupted line. The posting service also confirms the saved lines sum to zero before it commits.

**2. Money is integer cents, no floats.** `npm run lint` (the float ban), and:

```bash
grep -rnE "parseFloat|toFixed\(|Number\(.*(amount|cents)" src/domain src/import src/data src/services src/shared/money.ts
```

**3. Only the posting service writes journal entries and lines, each with an audit row in the same transaction.** `tools/single-writer.test.ts` (spec 041) fails if any source file but `src/data/journal-writes.ts` writes those tables, or if any file but `src/services/post-journal.ts` imports that file. `tools/audit-append-only.test.ts` keeps the audit log append-only. The search below must print nothing:

```bash
grep -rnE "(INSERT( OR [A-Z]+)? INTO|UPDATE|DELETE FROM|REPLACE INTO) +journal_(entry|line)" src/ tools/ --include='*.ts' | grep -v "\.test\.ts" | grep -v "src/data/journal-writes.ts"
```

**4. The same or an overlapping bank file never stores a line twice.** Not built yet. From spec 060: the duplicate and overlap tests, and a unique key on statement lines in the migration.

**5. SQLite is the only truth. Nothing from Google changes the ledger until accepted.** Not built yet. From folder 09, this must print nothing, and specs 116 and 117 test the accept step:

```bash
grep -rnE "from ['\"]@services/posting" src/google
```

**6. Nothing changes on or before the lock date.** The rule is enforced in the posting service (`validateEntry`, `changeEntry`, `removeEntry`), with tests for each (`src/domain/journal.test.ts`, `src/services/post-journal.test.ts`, `src/services/change-entry.test.ts`). Setting and unlocking the lock date is spec 096.

**7. `domain` and `import` are pure.** `npm run lint`, and:

```bash
grep -rnE "Date\.now|new Date\(\)|Math\.random|fetch\(|from ['\"](node:)?(fs|path|electron|better-sqlite3)" src/domain src/import
```

**8. The renderer only calls named bridge functions, validated with Zod in main.** `npm run lint`, and the search below. Also confirm every entry in `src/shared/bridge-contract.ts` has an `input` Zod schema, which `handleBridgeCall` in `src/main/bridge.ts` checks.

```bash
grep -rnE "from ['\"](electron|node:|@data|@services|@google|@main|better-sqlite3)" src/renderer
```

**9. No client-specific value in code (business name, ABN, bank account numbers, the accountant's email).** This finds BSBs, ABNs and email addresses. Each hit must be invented (the sample business is "Harbour Lane Joinery Pty Ltd"), or it is a fail. Also read new seed data and fixtures by eye.

```bash
grep -rnE "\b[0-9]{3}-[0-9]{3}\b|\b[0-9]{2} [0-9]{3} [0-9]{3} [0-9]{3}\b|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" src/ tools/ tests/
```

**10. Data leaves the Mac only through the client's action or setting.** The one expected hit is `net.fetch(pathToFileURL(file)...)` in `src/main/index.ts`, which reads the app's own files for the `app://` scheme. Anything else is a fail. No analytics, telemetry or crash upload anywhere.

```bash
grep -rnE "fetch\(|https?://|net\.request|http\.request" src/ --include='*.ts' --include='*.tsx' | grep -v "\.test\.ts" | grep -v "src/google/"
```

General standards, also a pass when empty:

```bash
grep -rnE ": any\b|as any\b|@ts-ignore|@ts-expect-error|eslint-disable" src tools tests
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(" src/renderer --include='*.tsx'   # colours only as design tokens (from spec 020)
grep -rnE "console\.(log|debug)" src
```

## 3. Judgment checks (read the diff)

Searches cannot see these. For the code changed in this session, confirm each:

- Expected failures are returned as a `Result`, not thrown (`src/shared/result.ts`). Throwing is only for bugs.
- Every outside input is checked at its boundary:
  - bridge calls with Zod in `src/main/bridge.ts`;
  - bank file text in `src/import/`;
  - rows read from SQLite in `src/data/`;
  - environment variables through `loadEnv()`;
  - later, Google responses and backup files.
- Logs hold only ids, event names, counts and codes. `createLogger` throws otherwise. Check that no message text holding a file path or bank text is logged.
- A migration already applied is never edited (`src/data/migrations/`). A change is a new numbered file.
- Calendar dates stay `CalendarDate` strings in the domain, never `Date` objects. Money goes through `src/shared/money.ts` only.
- A screen never receives a token, a file path from the client's folders, or raw SQL results that skip validation.
- Nothing is sent, deleted or changed without the client's action.

## 4. Report

A table with one row per invariant: pass, fail, or not built yet (with the spec that builds it). Give the file and line for each failure, and the fix. Do not fix silently. List the problems, then fix only what the author asks for, or what belongs to the current spec.
