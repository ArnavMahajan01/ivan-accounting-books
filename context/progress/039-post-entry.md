# 039: Posting Service: Post an Entry

Spec: [039](../feature-specs/03-ledger-core/039-post-entry.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/services/post-journal.ts`: `postEntry(ctx, input)` loads the lock date and each account named, runs `validateEntry`, and in one transaction writes the entry, its lines (one at a time) and one audit row (`entry.post`, with the whole entry as `after`). It returns the posted entry, or `business-not-set-up`, or `invalid-entry` with the problems. After writing it confirms the saved lines sum to zero, and throws (rolling everything back) if they do not.
- `src/data/journal-writes.ts`: the only SQL that writes the journal tables, which only `post-journal.ts` imports (spec 041). `src/data/journal-queries.ts`: reads, with every row checked by Zod.

## Verified

- `npm run check` passes (486 tests). `src/services/post-journal.test.ts`: a balanced entry posts with exactly one audit row and reads back equal; an unbalanced entry, a locked date, an inactive account, an unknown account and an unset business are refused with nothing saved; 25 posted entries all balance.
- **A forced failure halfway leaves no partial rows**, tested six ways: the random source fails on each of the five id requests (before anything, after the entry, after line 1, after line 2, before the audit row), the database refuses the second line, and the database refuses the audit row. After each, the entry, line and audit counts are unchanged.

## Notes

- Writing the lines one at a time (not all at once) is what makes "halfway" a real state to test.
