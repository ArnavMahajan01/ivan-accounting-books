# 073: Transfers Between His Accounts

Spec: [073](../feature-specs/06-demo-4-to-review/073-transfers.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `src/domain/transfer-match.ts`: the opposite amount in another of his accounts within five days, closest first.
- `postTransfer`: with the other side waiting, one entry posts both and pairs them; otherwise the line posts against **Transfers in transit** (new account 1090, by role), and the other side clears it and pairs when it arrives. No GST.
- The row shows **Pair** and "Transfer to …"; the Transfer sheet (button or T) names the other account and the matching line.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Tests: matched pair (one entry, both posted and paired); other side later (clearing back to zero, both paired); no match (waits in clearing); undo of either side.
- Built app: the Demo 4 transfer paired across both accounts ("2 posted").

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
