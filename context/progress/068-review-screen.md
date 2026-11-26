# 068: To Review Screen

Spec: [068](../feature-specs/06-demo-4-to-review/068-review-screen.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- Migration `0010-review.sql`: `account_role` (the GST account and a new **Transfers in transit** clearing account, 1090, found by role, never by code), `statement_line.entry_id` and `paired_line_id`, and `contact_match`. Books set up before it get both roles by a backfill; new books get them from `setupBusiness` (the chart template gained `role`). The chart is now 40 accounts, so five tests that counted 39 now count 40.
- `src/data/review-repository.ts`: waiting lines, links, history, matchable entries, contact matches.
- `src/services/list-review.ts` and bridge `review.list` (filters: bank account, all / suggested / no suggestion, search on description or an amount such as `88.20`). Counts follow the bank account and search filters; `waiting` is every line, for the sidebar badge. At most 200 lines are listed, oldest first, with a line saying so.
- `src/renderer/pages/ToReviewPage.tsx` with `src/renderer/review/` (text helpers, Split and Transfer sheets, CSS): wireframe W05 Option 1 with Option 3's "Post all suggested". Columns: date, bank description with From/To under it, Spent, Received, Match or account with the GST code under it, Post. GST and From/To are stacked rather than in their own columns so every column fits at 1100 wide without sideways scrolling; the order and names follow the wireframe.
- Keys: arrows, Space, Return (post), ⌘Return (post selected), any letter or digit starts typing the account, S split, T transfer, ⌘Z undo, listed in a bar at the bottom.
- Two optional props on the shared `Table` (`onRowKeyDown`, `rowClassName`), and a fix to `Table.css`: the select column's heading was left-aligned while its boxes were centred (`.table th` beat `.table__select`); no table had used selection before.

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- `src/renderer/pages/review.test.tsx` (20 tests): columns, why text, filters combined in one request, empty state with Go to Bank, error with Try again, one main action, keys bar.
- `npm run test:layout` (built app, sample data, 2 to 13 November and Demo 4 files): passes at 1100, 1280, 1440 and 1700 for To review, the Split sheet and the Transfer sheet. It found and I fixed: sideways scroll at 1100, words broken mid-word, and the select heading alignment.
- Looked at by eye: 1100 by 700 and 1440, light and dark (`emulateMedia`), in the built app.
- "200 lines scroll smoothly": the service test lists 250 and returns 200; scrolling 200 rows was not timed by hand.
- Impeccable `critique` 30/40 and `audit` 16/20, run inline (the launcher and detector were not run, per the project's rules, so Implementation integrity is from code and screenshots only). Fixed: P1 row height (bank account name only when the list mixes accounts), P2 account cell width at large sizes, P2 disabled "Post all suggested (0)" hidden. Open P2: failed lines after a batch are not marked in the table; rows are two or three lines tall at 1100.

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
