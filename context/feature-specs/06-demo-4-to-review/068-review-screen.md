# 068: To Review Screen

The table where imported lines wait, laid out like his QuickBooks tab (wireframe W05, Option 1): date, description, Spent, Received, From/To, account, GST, Post.

**Client sees:** his imported (sample) lines waiting in To review.

## Depends On

- 067

## Implementation

1. Bridge function `review.list` with filters (bank account, all, suggested, no suggestion, text) and the count for the sidebar badge.
2. The table with separate Spent and Received columns, From/To, account picker, GST picker and a Post button per row.
3. Keyboard: arrows move, Space selects, the key bar at the bottom lists every shortcut.
4. Empty state: "Nothing to review. Import a file from the Bank page."

## Check When Done

- 200 lines scroll smoothly. Filters combine. The badge count matches.
- Impeccable `critique` and `audit`. Both themes, 1100 and 1440. `npm run check` passes.
