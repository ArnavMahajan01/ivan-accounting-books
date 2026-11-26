# 072: Split a Line Across Accounts

Spec: [072](../feature-specs/06-demo-4-to-review/072-split-line.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `lineToEntry` takes several parts; `postSplitLine`; bridge `review.split` (1 to 20 parts, positive whole cents).
- `src/renderer/review/SplitSheet.tsx`: Split… or S; rows of account, GST code, amount (with GST, as on the receipt); Add line; "Left to split" live (with "too much"); Save only at $0.00 with every part given an account.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Tests: a 2-way and a 4-way split balance with GST right on each part; every split of 2 to 200 cents into two parts balances (no cent over); parts that do not add up are refused.
- Screen test: S opens it, $0.00 ✓ enables Save, the parts sent are exact.
- Impeccable critique of the sheet within the To review critique (068). Looked at in light and dark at 1100.

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
