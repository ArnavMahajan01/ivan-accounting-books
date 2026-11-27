# 115: Shared Sheets Screen: By Person

The Shared sheets page grouped by person (W07, Option 2): who can see what, change a role in the row, stop sharing one or all (risk G5).

**Client sees:** "accountant@… can see 3 sheets" and "Stop sharing everything".

## Depends On

- 114

## Implementation

1. Lists people from Drive permissions on the app's files, refreshed on open.
2. Change role, stop sharing (confirmation), stop sharing everything with a person.
3. "Only you" lists published but unshared workbooks.

## Check When Done

- Manual test: change and remove roles, the second test account loses access. Impeccable `critique` and `audit`.
