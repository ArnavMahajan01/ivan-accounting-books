# 069: Post One Line With an Account and GST

Spec: [069](../feature-specs/06-demo-4-to-review/069-post-one.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `src/domain/line-to-entry.ts` (pure): bank line plus parts gives the entry, GST from `splitInclusive`, one GST line for the total; with one part it equals `simpleEntry`.
- `src/services/post-line.ts`: `postLineToAccount` posts through `postEntry`, marks the line posted with `entry_id`, and adds a `line.post` audit row, in one transaction. A null GST code means the account's usual one. His bank accounts and the transfers account are refused as a category (`use-transfer`).
- In the row: the account box is a list of every account but his bank accounts and Transfers in transit, found by label, code, name, or the start of a name that fits one account. Return posts. The row fades out over the motion token (1 ms under reduced motion), then the list reloads.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- `src/domain/line-to-entry.test.ts` (13): money in and out, GST-free, input taxed, outside GST, refund, payee placement, equal to `simpleEntry`.
- `src/services/review.test.ts`: posting gives a balanced entry with the right GST, the books check clean (`countUnbalancedEntries` 0, integrity and `foreign_key_check` empty); posting the same line twice is refused; locked period refused with nothing written.
- In the built app: a line posted with Return appears at the top of Transactions; Home's figures move. (The e2e suite was run once at the end; it does not post a line, see the 077 record.)

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
