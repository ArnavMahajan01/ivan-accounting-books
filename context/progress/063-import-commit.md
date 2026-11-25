# 063: Import Commit Service

Spec: [063](../feature-specs/05-demo-3-bank-import/063-import-commit.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `commitImport(ctx, prepared)` in `src/services/import-file.ts`: inside one transaction it works the duplicates out again, writes the batch, the new lines (status `to-review`) and an audit row (`import.commit`, the batch only, with no line descriptions), or nothing. It refuses when nothing is new (`nothing-new`) or the account has gone (`account-gone`).
- Bridge function `bank.commitImport`: a preview can be used once, and a second use says `no-such-preview`. The main process logs the counts only (`import.previewed`, `import.imported`).

## Verified

- Tests: the same file imported twice, and one preview committed twice, add no second copy; a forced failure on the sixth random id (the fifth line) leaves no batch, no lines and no audit row, and the same file then imports cleanly; 10,000 lines commit and then all show as already imported; a preview is forgotten when the books change.
- In the packaged app (`tests/e2e/packaged-app.spec.ts`): four files imported in turn; the log has `import.imported` and holds none of the descriptions or account digits.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- Importing is not a ledger write (it writes statement lines, not journal rows), so the single-writer guard is untouched. The audit row is added all the same, so an import has a history.
