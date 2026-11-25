# 061: Closing Balance Check

Checks that the books will match the statement's closing balance after import, and explains a difference.

**Client sees:** "Closing balance matches" or the difference in plain words.

## Depends On

- 060

## Implementation

1. `src/domain/balance-check.ts` (pure): from the account's balance before, the new lines, and the file's closing balance, return match or the difference, and whether rejected lines explain it.

## Check When Done

- Tests: a match, a difference equal to a rejected line, an unexplained difference.
