# 048: Home: Summary Numbers and Warnings

Home's four numbers from the signed-off wireframe: bank balance, lines to review, GST owing this period, profit this financial year, each opening its page, and warnings only when something is wrong.

**Client sees:** Home with real figures from the sample books.

## Depends On

- 047

## Implementation

1. Bridge function `home.getSummary`: the four figures from balances and periods. Lines to review is zero until folder 05.
2. Each figure links to its page. Numbers use `Amount`.
3. Warnings area: books check problems (043). Later folders add backup and Google warnings.

## Check When Done

- The figures match the sample data's figure list. A forced books problem shows a warning.
- Impeccable `critique` and `audit`, P0 and P1 fixed. `npm run check` passes.
