# 086: Reconcile Screen

Reconciling an account in a few clicks, with the difference explained.

**Client sees:** "Reconcile Business One to 30/11/2026".

## Depends On

- 085

## Implementation

1. From the Bank page: pick the account, the statement date and closing balance (filled from the last import when known).
2. The difference in words, and the lines that explain it, with links to post them.
3. Finish when it is zero. The Bank page shows "reconciled to".

## Check When Done

- e2e with a fixture: reconcile to zero. Impeccable `critique` and `audit`.
