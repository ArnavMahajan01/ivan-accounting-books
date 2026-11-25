# 060: Duplicate and Overlap Detection

Spec: [060](../feature-specs/05-demo-3-bank-import/060-duplicates.md)
Status: Done (spec 059 still waiting, as the spec allows)
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/domain/duplicates.ts` (pure): `lineKeys` and `markDuplicates`. A line's key is `id:<FITID>` when the file has one, otherwise `calc:<day>|<amount>|<description>|<balance>` with capitals and spacing ignored. A second line with the same base key in the file gets `#2`, a third `#3`, so two real identical lines are both kept, and the same line in an overlapping file gets the same key even though it sits at a different place. Lines that share a `FITID` are both kept, not merged.
- The spec says "position in the file is part of the key". The count of identical lines before it is used instead, because a plain position changes between overlapping files and would let the same line in twice.

## Verified

- `src/domain/duplicates.test.ts`: 10 tests: the same file twice gives no new line; an overlapping file gives only the new days, with and without bank ids; two identical coffees on one day both stay, and only a third arriving later is new; keys ignore capitals and spacing; every part of a computed key matters.
- In the service and in the packaged app: the same file twice, and the overlapping file (6 skipped, 7 new).
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

Nothing else.
