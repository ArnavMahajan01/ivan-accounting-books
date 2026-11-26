# 075: Undo the Last Post

Undo a post he just made, so a slip is never a problem.

**Client sees:** "Posted. Undo" after each post, and ⌘Z.

## Depends On

- 074

## Implementation

1. Undo removes the entry through `removeEntry` (with its audit row) and returns the line to `to_review`.
2. Available for the last action, including a batch of many.

## Check When Done

- Tests: undo one, undo a batch, undo refused in a locked period. `npm run check` passes.
