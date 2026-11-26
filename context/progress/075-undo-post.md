# 075: Undo the Last Post

Spec: [075](../feature-specs/06-demo-4-to-review/075-undo-post.md)
Status: Done
Date: 2026-11-25
Branch: feature/06-demo-4-to-review

## What was done

- `src/services/undo-post.ts`: checks every line and lock first, then in one transaction puts the lines back (both sides of a paired transfer), unpairs a partner, and removes each entry the post made through `removeEntry` (audited). A matched entry stays.
- "Posted. Undo" in the message after every post, payee save and split; ⌘Z when focus is not in a text box (so typing keeps its own undo).

## Verified

- `npm run check` (typecheck both configs, lint, 89 test files, 1,018 tests) and `npm run format:check`: pass on 2026-11-25.
- Tests: undo one (entry removed with `entry.post` and `entry.remove` audit rows), a batch, refused in a locked period with nothing changed, a paired transfer, the later side of a transfer, a match.
- Built app: ⌘Z on a row undid the last post ("Undone. 1 line is back in To review.").

## Notes

- Built in one run of folder 06 at the author's request. Decisions taken where the specs left room are listed in `progress-tracker.md` (Follow-ups) for the author.
