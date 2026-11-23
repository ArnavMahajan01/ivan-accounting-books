# 050: Chart of Accounts Screen

Spec: [050](../feature-specs/04-demo-2-the-sample-book/050-accounts-screen.md)
Status: Done (Impeccable skill not run)
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- Bridge function `accounts.list`: every account with its balance as at today, its usual GST (from its default tax code) and, for his bank accounts, the bank and the last four digits.
- `AccountsPage.tsx`: a table grouped as the wireframe is, with **Bank accounts** first, then Other assets, Liabilities, Equity, Income and Expenses. Columns: account (code and name), type, usual GST, balance in your books, and a Transactions link. Search by name or code (every word must match). Inactive accounts are hidden behind a checkbox that appears only when there are some.
- The `Table` component gained **group headings** (`groupBy`).
- Press Enter on a row, or click Transactions in it, to open Transactions filtered to that account.
- A note under the table gives the date it is as at, and says a minus sign means a credit balance, such as GST owing.

## Verified

- `npm run check` passes. `views.test.ts`: **every balance matches the trial balance to the cent**, the bank accounts are marked, the usual GST is right for each kind of account, and entries after today are left out. `accounts.test.tsx` (13 tests): the groups, the figures with a minus sign for a credit, code order, search by name, code and several words, the empty search message, the inactive filter (shown only when there is something to show), Enter on a row, loading, an unreadable list, no accounts, and a very long name.
- **Looked at in the real app** at 1100 by 700 and 1440 wide, in light and dark. The table scrolls inside its own box. Tab goes through the sidebar, the search box and the table, each named, each with a focus ring.

## Notes

- The balances are signed as in the trial balance: debits positive, credits negative. So Sales shows as a minus figure, as the wireframe's GST does. **Client question 29** asks whether he would rather see plain positive numbers.
- "Bank accounts also show the last statement balance once folder 05 exists": not yet, as the spec says.
- Impeccable was not run (see 048).
