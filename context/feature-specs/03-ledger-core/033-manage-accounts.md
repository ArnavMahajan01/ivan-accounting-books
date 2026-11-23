# 033: Manage Accounts Service

Adding, renaming and deactivating accounts, with the rules that protect posted history.

**Client sees:** nothing yet. Screens in 084.

## Depends On

- 032

## Implementation

1. `src/services/manage-accounts.ts`: add, rename, change code, deactivate, reactivate.
2. Deactivating an account with posted lines is allowed. Deleting and merging are never offered.
3. Every change writes an audit row.

## Check When Done

- Tests for each action, and that an inactive account is refused by new postings (checked again in 038).
- `npm run check` passes.
