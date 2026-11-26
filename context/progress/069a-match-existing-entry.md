# 069a: Match a Line to an Entry Already in the Books

Spec: [069a](../feature-specs/06-demo-4-to-review/069a-match-existing-entry.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- New spec, written and built 2026-11-25 because the signed-off design has "Match or account" and nothing in folder 06 did it; without it the demo files posted the sample books' November twice.
- `src/domain/entry-match.ts` and `closest-date.ts` (shared with transfers); `listMatchableEntries`; `matchLine` (links, `line.match` audit row, no journal row). One entry is offered to one line only. Undo unlinks and keeps the entry.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- `review.test.ts`: offered and linked with nothing posted; another amount, an already linked entry, two lines for one entry; undo keeps the entry.
- `review-sample.test.ts`: the 2 to 13 November file imported into the sample books offers a match on all 11 lines; matching them leaves the entry count and Business One's balance unchanged; the 9 to 20 November file's 7 new lines match too.
- Built app: 11 and 7 matched with Post all suggested.

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
