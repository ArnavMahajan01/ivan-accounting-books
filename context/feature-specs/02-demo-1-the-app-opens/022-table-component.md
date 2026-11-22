# 022: Table Component

One table used by every list in the app: sortable columns, row selection, keyboard movement, sticky header, and scrolling inside its own box.

**Client sees:** the table style used for bank lines, transactions and reports.

## Depends On

- 021

## Implementation

1. `Table`: columns with alignment (amounts right), sort, optional checkbox selection, sticky header.
2. Keyboard: arrow keys move the row focus, Space selects, Enter runs the row's main action.
3. Wide tables scroll inside their own container, never the page.
4. A loading state of skeleton rows shaped like the table.

## Check When Done

- Tests for sort, selection and keys. Shown on the components page with 500 invented rows, still smooth.
- Impeccable `critique` and `audit`, P0 and P1 fixed. `npm run check` passes.
