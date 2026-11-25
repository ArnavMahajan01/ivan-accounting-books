# 065c: Table Columns Hold at Any Window Size, and a Layout Sweep

Fixes tables whose columns went wrong as the window changed size, says on the Bank page which file type it takes, and adds a check that opens every page at four window sizes and fails if anything breaks. Added 2026-11-24, after the author saw the Bank table's columns go wrong when the window was resized.

**Client sees:** column headings that sit over their figures at any window size, no sideways scrolling in the Transactions table, and a line on the Bank page saying the file must be an OFX file from Westpac.

## Depends On

- 065

## Implementation

1. `Table`: a heading of a right-aligned column is aligned like its figures (a CSS rule was overriding it, in every table). A column can be marked `fit`: it takes only the width its content needs and never wraps, so dates and amounts stay whole. The other columns share what is left and their text wraps.
2. Mark the date and amount columns `fit` in Transactions, the figure and status columns in Accounts, Bank and the import sheet. Remove the rule that stopped the Type column wrapping, which made the Transactions table wider than its box at the smallest window.
3. Buttons never split their label over two lines. The business's name in the sidebar wraps to two lines before it is cut.
4. The Bank page's drop zone says: "The file must be an OFX file from Westpac Online Banking, for one account."
5. `tests/layout/` and `npm run test:layout`: the built app, with sample data and one imported file, opens every page, the transaction panel, the import sheet and the undo question at 1100 by 700, 1280 by 800, 1440 by 900 and 1700 by 1000, saves a screenshot of each to `test-results/layout/`, and fails on: the page or a table scrolling sideways, a column heading not aligned like its figures, a button or a figure split over two lines, or text cut off.

## Scope Limits

- Does not add a second layout for narrow windows: the window cannot be smaller than 1100 by 700.
- The sweep looks for the ways a layout breaks. It does not judge how it looks: the Impeccable `critique` does that.

## Check When Done

- `npm run test:layout` passes, and failed with 140 problems before the fixes.
- Table tests for the heading class and the fit class. `npm run check` passes.
