# 043: Books Check on Launch

Checks on every launch that the books balance, and says so plainly if they do not.

**Client sees:** a warning on Home, only if something is wrong (from Demo 2).

## Depends On

- 042

## Implementation

1. `src/services/check-books.ts`: the trial balance from the first entry to today must be zero, and the integrity check passed.
2. The result is available through the bridge as `books.getHealth`. The main process logs the event with counts only.

## Check When Done

- A test with a deliberately corrupted row (written straight to a test database) reports the problem.
- `npm run check` passes.
