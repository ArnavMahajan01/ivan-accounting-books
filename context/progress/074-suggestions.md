# 074: Suggestions From Past Lines

Spec: [074](../feature-specs/06-demo-4-to-review/074-suggestions.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `src/domain/suggest.ts`: "same as last time" (same words, most recent) or "best guess" (same first word of four letters or more, account used most); money in and out kept apart. History is posted and matched bank lines whose entry has one category line (splits and transfers left out).
- Shown under the account box, with the GST code and payee filled in. Never posted without him; Post all suggested posts only what he clicks.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Tests with invented history; a line with no history gets none.
- Built app: after matching the November files, BUNNINGS, AMPOL and SKYLINK in the Demo 4 file show "same as last time"; after one Total Tools line was posted, the other two did.

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
