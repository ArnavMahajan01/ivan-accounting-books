# 063a: Undo an Import

Spec: [063a](../feature-specs/05-demo-3-bank-import/063a-undo-import.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/services/undo-import.ts` `undoImport(ctx, batchId)`: in one transaction, removes the batch and every line it added, and writes an audit row (`import.undo`, the batch, no line descriptions). It refuses with `not-found`, `not-the-latest` or `lines-already-used`, and changes nothing when it does.
- "Latest" is the file imported last for the account (newest `imported_at`), not the one covering the latest days, because the person means what he just did.
- `src/data/statement-repository.ts`: `getImportBatch`, `lastImportedBatch`, `countUsedLinesInBatch`, `deleteBatchWithLines`. Bridge function `bank.undoImport`. `bank.list` gives each account an `undoableImport` (batch id, file name, lines added, period) while its last import can still be taken back.
- The spec was written on 2026-11-24 at the author's choice, after the Impeccable critique of the Bank page found that a saved import could not be taken back.

## Verified

- `src/services/undo-import.test.ts` (9 tests): the latest import is removed with its lines and the same file imports as new again; one audit row with no description; the newest then the one before it can be taken back, but not an older one first; the file imported last counts as the latest even if it covers earlier days; a line already used, a missing id and an id already undone are refused with nothing changed; a forced failure removes nothing; the Bank view offers it and stops offering it.
- `src/main/import-handlers.test.ts` (9): the bridge function, the count, the offer and the log line; `bridge.test.ts` has 3 more input checks.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 885 passed (885)" in 81 files. `npm run format:check`: clean. `npm run test:e2e`: package check passed, "2 passed".

## Notes

- Taking back the first import of an account removes the starting balance the later closing balance checks use. Only the latest import can be undone, so the files before it are never left inconsistent (see 061).
- Lines already posted or excluded are not undone: un-posting is folder 06 (spec 075).
