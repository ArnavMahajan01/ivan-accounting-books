# 065b: The Closing Balance Warning Says Importing Is Still Allowed

Spec: [065b](../feature-specs/05-demo-3-bank-import/065b-mismatch-wording.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `balanceMessage` in `src/renderer/import/import-text.ts` now ends the warning with what to do: when the unreadable lines are the difference, "You can still import the other lines. The balance will not match until that line is in."; otherwise "You can still import. A line may be missing from this file or from an earlier one."
- The guide's problem list says the same.

## Verified

- `src/renderer/import/import-text.test.ts` and the sheet tests say the new sentences. The packaged-app test still finds the difference sentence. `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 885 passed (885)" in 81 files. `npm run format:check`: clean. `npm run test:e2e`: package check passed, "2 passed".

## Notes

- Nothing changes about when a difference is found, or what blocks an import (nothing does).
