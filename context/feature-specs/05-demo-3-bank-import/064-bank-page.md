# 064: Bank Page

The Bank page: one row per account with balances and reconciliation status, Import file as the main action, and a drop zone.

**Client sees:** the Bank page from the wireframe.

## Depends On

- 063

## Implementation

1. Table: account, last four digits, balance in the books, last statement balance and date, reconciled to (filled by folder 07).
2. Import file (main action) opens the Mac file chooser for `.ofx` and `.csv`. Dropping a file anywhere on the window also works.
3. Empty state: "No bank lines yet. Import a file from Westpac Online Banking", linking to the guide.

## Check When Done

- Drop and choose both open the preview. Both themes, 1100 and 1440.
- Impeccable `critique` and `audit`. `npm run check` passes.
