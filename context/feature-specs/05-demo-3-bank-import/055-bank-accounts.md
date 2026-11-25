# 055: Bank Accounts

His bank accounts, each linked to a ledger account, with the last four digits used to check that a file belongs to the right account.

**Client sees:** his (sample) bank accounts.

## Depends On

- 054

## Implementation

1. Migration: `bank_account` (id, name, bank, last four digits, ledger account id, sub-account of, active).
2. Service to add, rename and deactivate, with audit rows.
3. The sample set gets its two accounts.

## Rules And Edge Cases

- Several Westpac accounts and sub-accounts are supported (seen in his QuickBooks, client question 4).

## Check When Done

- Tests for each action. `npm run check` passes.
