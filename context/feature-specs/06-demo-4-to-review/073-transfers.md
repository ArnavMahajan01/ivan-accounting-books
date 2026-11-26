# 073: Transfers Between His Accounts

Money moved between his own accounts is a transfer: not income, not an expense, no GST, and the two bank lines are paired.

**Client sees:** "Pair" with the matching line in the other account.

## Depends On

- 072

## Implementation

1. `src/domain/transfer-match.ts` (pure): finds the opposite line in another of his accounts with the same amount within 5 days.
2. Transfer sheet (button and T key): the other account, and the matching line if found. Posting pairs both lines in one entry.
3. If the other side is not imported yet, it posts to a transfer clearing account and pairs when it arrives.

## Check When Done

- Tests: matched pair, other side later, no match. Both lines end `posted`. `npm run check` passes.
