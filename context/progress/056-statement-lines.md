# 056: Statement Lines and Import Batches

Spec: [056](../feature-specs/05-demo-3-bank-import/056-statement-lines.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/data/migrations/0009-statement-lines.sql`: `import_batch` (bank account, file name, format, SHA-256 of the file text, period from and to, counts of new, duplicate and rejected lines, the opening and the closing balance with its date, imported at) and `statement_line` (bank account, batch, date, description, amount in cents never zero, running balance, `line_key`, status, created at). `UNIQUE (bank_account_id, line_key)` is the key that refuses a line twice (risk L3). STRICT tables, CHECK rules on dates, hash, counts and balance pairs, and indexes for the batch, the review list and each account's batches.
- `src/domain/statement-lines.ts` (`StatementLine`, `ImportBatch`), `src/data/statement-repository.ts` (insert, keys already stored, lines in a batch, counts, the latest batch for an account, the stream's starting balance, sums), `STATEMENT_LINE_STATUSES`, `IMPORT_FORMATS` and the `pre` id kind in `src/shared/kinds.ts`.
- Choices where the spec left room: the status literals are `to-review`, `posted` and `excluded` (kebab case, like every other literal in the code), not `to_review` as the spec text has it; the spec's "bank id or computed key" is one column, `line_key`, with an `id:` or `calc:` prefix; `opening_balance_cents` was added to the batch (the spec lists only the closing balance) because the closing balance check needs a starting figure (spec 061).

## Verified

- `src/data/statement-tables.test.ts`: 8 tests: a batch and its lines read back as written and `PRAGMA integrity_check` is clean; the same line twice for one account is refused by the unique key, and allowed for another account; a line of nothing, a made-up status, an unknown account or batch are refused; a batch that ends before it starts, a bad hash and half a balance pair are refused.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- Written after 0009 was first made, in the same session: the `opening_balance_cents` column was added to the migration file before it was ever applied to any real books, so no applied migration was edited.
- A line is never changed after import except its status (folder 06).
