# 051: Transactions List

Spec: [051](../feature-specs/04-demo-2-the-sample-book/051-transactions-list.md)
Status: Done (Impeccable skill not run)
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- Bridge function `transactions.list`, with strict input checks: a ready-made period or typed dates, an account, the kind (all, money in, money out, transfers), a search, and a page (100 at a time, up to 200). It answers with the rows, how many match, the days covered, the totals of **every** matching entry, and, when one account is chosen, that account's total.
- Each entry reads as one row (`src/domain/entry-summary.ts`): date, type (bank line, invoice payment, journal), payee, the account it was for, before GST, GST and total, and whether money came in, went out or moved between his own accounts. The filters and counts are done in SQL with bound parameters (`src/data/transaction-queries.ts`), so a search word can never become SQL, and `%` and `_` search as themselves.
- A search that reads as an amount, such as 342.15, also finds the entries that total that amount.
- `TransactionsPage.tsx`: the filters on one row, the table (`DateCell`, `Amount`, a "Locked" badge in the account cell), the totals underneath, Previous and Next, "Clear filters", and a message for no transactions and for no match. The ready-made date ranges (last 12 months, this financial year, this BAS period, all dates) are worked out in the main process from the financial-year rules, so the screen does not repeat them.
- The `Table` gained a click action on a row and a mark for the open row.

## Verified

- `npm run check` passes. `views.test.ts`: the list matches the wireframe's rows (Smith Renovations, Timberlink, Bunnings, Ampol); newest first; totals over all matches whatever the page; paging gives every row once; money in, money out and transfers add up to everything (21, 70 and 3); the date range includes both days; a filtered account's total matches the trial balance for the same days, for four accounts; searches by word, by amount, and for `%`, `_` and a SQL injection string; every filter combined; locked entries marked once a lock date is set; bad and reversed dates refused.
- **1,000 sample entries:** a test posts 1,000 more entries and lists a page and a filtered search in under 2 seconds, with the totals still exact and the books still balanced. Each page shows 100 rows.
- `transactions.test.tsx` (27 tests): the rows, "Locked" in words, the totals, each filter sending the right request, the search waiting until he stops typing, Clear filters, paging, and every state. The screen was looked at in the real app at 1100 and 1440 wide, in light and dark.

## Notes

- "Locked rows show 'Locked' (from folder 08)": the display works now (tested by setting a lock date). The sample books have no lock date, so nothing shows it until folder 08.
- "1,000 entries scroll smoothly": tested as the list query and a page of 100 rows, not by eye on 1,000 rows scrolling, since the screen pages at 100.
- Export of the list waits for 098.
