# 083: Change the Account on Posted Transactions

Fixing posted entries from the Transactions list: change one in the row, or move several to another account (W05b, Options 1 and 3).

**Client sees:** account pickers in Transactions, and "Move 3 to…".

## Depends On

- 082

## Implementation

1. Changing the account in a row rebuilds that entry through `changeEntry`, with GST recalculated for the new code.
2. Select several and "Move to": each changed separately, each with its audit row.
3. Locked rows are read-only, with "Locked" in words.

## Check When Done

- Tests: change, move many, locked refused. The history panel shows each change. `npm run check` passes.
