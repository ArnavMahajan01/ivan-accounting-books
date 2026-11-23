# 050: Chart of Accounts Screen

The chart of accounts as a table, like his QuickBooks page (wireframe W05b): grouped by type, with usual GST and balance.

**Client sees:** the sample chart of accounts with balances.

## Depends On

- 049

## Implementation

1. Bridge function `accounts.list` with balances as at today.
2. Table grouped by type: name, code, type, usual GST, balance in the books. Bank accounts also show the last statement balance once folder 05 exists.
3. Search by name or code. Inactive accounts hidden behind a filter.

## Check When Done

- Balances match the trial balance. 1100 by 700 and 1440 checked, both themes.
- Impeccable `critique` and `audit`. `npm run check` passes.
