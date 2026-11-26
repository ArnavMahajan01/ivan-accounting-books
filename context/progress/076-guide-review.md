# 076: guide-to-review

Spec: [076](../feature-specs/06-demo-4-to-review/076-guide-review.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- Three guides in a new Help group **To review**: `review-and-post-bank-lines.json`, `split-a-bank-line.json`, `mark-a-transfer.json`, with three sample-data images (`review-table.png` 136 KB, `split-sheet.png`, `transfer-sheet.png`), taken from the built app at 1440 in light mode.
- Getting started now says what To review does.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- `tools/guide-problems.test.ts`: every guide validates and every image exists (one description was too long, shortened).
- The steps were followed in the built app by the driving script (post, payee, split, transfer, undo, ⌘Return). Not read through by the client yet.

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
