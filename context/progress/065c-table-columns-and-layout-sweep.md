# 065c: Table Columns Hold at Any Window Size, and a Layout Sweep

Spec: [065c](../feature-specs/05-demo-3-bank-import/065c-table-columns-and-layout-sweep.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- **The cause of the table problem:** `.table th { text-align: start }` is more specific than the class for a right-aligned column, so the heading of every right-aligned column stayed on the left while its figures sat on the right. The wider the window, the further apart they were. It affected the Bank, Transactions, Accounts and import tables, and had been there since the Table component (spec 022).
- **`Table`:** the heading rule is fixed (`.table th.table__cell--end`), and a column can be marked `fit` (`width: 1%; white-space: nowrap`), so dates, amounts and statuses stay whole while the text columns share what is left and wrap. Marked on Transactions (date, three amounts), Accounts (type, usual GST, balance, link), Bank (every column but the account) and the import sheet (date, amount, status).
- **Transactions at 1100 wide** had a sideways scroll bar and its Total column touched the edge, because the Type column could not wrap. It wraps now.
- **Buttons** never split their label over two lines (`white-space: nowrap`, and the Undo import button no longer shrinks). **The sidebar's business name** wraps to two lines before it is cut.
- **The Bank page says which file it takes:** "The file must be an OFX file from Westpac Online Banking, for one account." (It said "a Westpac statement file" and nothing about the type.)
- **`npm run test:layout`** (`tests/layout/`, `playwright.layout.config.ts`): the built app, unpackaged, with sample data and one imported file, opens 11 pages plus the transaction panel, the import sheet and the undo question at 1100 by 700, 1280 by 800, 1440 by 900 and 1700 by 1000, writes a screenshot of each to `test-results/layout/` and the problems to `problems.txt`.

## Verified

- Before the fixes the sweep reported **140 problems**: 74 headings not aligned like their figures, 56 sidebar names cut off, 4 buttons split, 2 tables scrolling sideways at 1100 wide and 4 hidden screen-reader captions that were wrongly counted (the check was corrected to leave out text hidden on purpose). After the fixes it reports none: "1 passed".
- Looked at in the real app: the Bank table at 1100 and 1700 wide, and Transactions at 1100 wide, headings over their figures, no sideways scroll bar, Total fully visible.
- `src/renderer/components/Table.test.tsx` (2 new tests), `src/renderer/pages/bank.test.tsx` (the file-type note). `npm run check`: Tests 887 passed. `npm run format:check`: clean. `npm run test:e2e`: 2 passed.

## Notes

- **The earlier Impeccable audit of these screens missed this.** Its measurements did not compare a heading's alignment with its figures, and looked at Transactions at 1200 wide only, not at 1100. The sweep now does both, at four sizes.
- The sweep finds the ways a layout breaks. It does not judge how a page looks.
- The guide images were retaken, because the headings moved and the Bank page gained a line.
