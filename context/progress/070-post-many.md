# 070: Post Many Lines at Once

Spec: [070](../feature-specs/06-demo-4-to-review/070-post-many.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `postLines(actions)`: each line in its own transaction; failures come back with a reason; the other side of a transfer posted earlier in the batch is skipped quietly. Bridge `review.post` takes 1 to 500 actions (account, match or transfer).
- Tick boxes and Space, Select all for the filter shown (the table's own), **Post N selected** (⌘Return), **Post all suggested (N)**. Message such as "12 posted. 1 needs an account." 

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Service test: 12 lines with one missing an account posts 11 and reports 1; a missing line does not stop the next.
- Screen tests: two ticked lines with ⌘Return send both, and the message reads "1 posted. 1 needs an account."
- Built app: ⌘Return posted 2 ticked lines (the Mac menu did not take the key).

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
