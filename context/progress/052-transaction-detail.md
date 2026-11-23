# 052: Transaction Detail and History Panel

Spec: [052](../feature-specs/04-demo-2-the-sample-book/052-transaction-detail.md)
Status: Done (Impeccable skill not run)
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- Bridge function `transactions.get(id)`: the entry (date, payee, description, source, amounts), its lines (account, debit, credit, GST and tax code), whether it is locked, and its **history** from the audit log. Each change is described in plain words by `src/domain/entry-diff.ts` ("Account changed from Tools and small equipment to Materials and supplies", "Date changed from 29/09/2026 to 28/09/2026", a new description, payee or total). An entry that no longer exists gives null.
- `SidePanel` (a new component) and `TransactionPanel.tsx`: a panel beside the list, with **What it did to the books** (a debit and credit column with a totals row) and **History** (Posted, and each change, with its date and time in his own time zone). Escape or the Close button closes it, focus moves to its heading when it opens and goes back to the row when it closes. It floats over the list in windows narrower than 1500 wide, and sits beside it in wider ones.

## Verified

- `npm run check` passes. `views.test.ts`: a sale's lines sum to zero (1000 debit $4,950.00, Sales credit $4,500.00 with GST $450.00, GST account credit $450.00) with one "Posted" row; the two corrected entries show a "Changed" row with the right words; a missing entry gives null; a locked entry is marked. `transactions.test.tsx` and `side-panel-and-table-groups.test.tsx`: the panel's content, totals that are equal, Escape and Close, focus going back to the row, another row replacing it, the locked, gone and unreadable states.
- **In the real app:** clicking a transaction opened the panel with focus on its heading, and Escape closed it. The Bunnings entry shows lines that sum to zero ($342.15 on each side) and a history of Posted then Changed.
- The sidebar was given its own name ("Sidebar"), since the page now has two landmark regions.

## Notes

- There is no person to name in the history ("who changed it"): this is one person's app, so each row says what and when.
