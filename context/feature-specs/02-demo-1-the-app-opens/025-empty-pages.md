# 025: Every Page With Its Empty State

Each sidebar page exists with its toolbar and an empty state saying what will appear there, so the client can walk the whole app from the first demo.

**Client sees:** every page of the app, each explaining what it will hold.

## Depends On

- 024

## Implementation

1. Home, To review, Bank, Transactions, Accounts, Reports, Shared sheets, Accountant changes, Settings: each with its toolbar and an `EmptyState` using the wording from the signed-off wireframes.
2. Pages not built yet say "Coming in a later version" in plain words, never a broken screen.

## Check When Done

- Every page opens with no console errors, in both themes.
- Impeccable `critique` on two pages, P0 and P1 fixed. `npm run check` passes.
