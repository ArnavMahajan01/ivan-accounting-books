# 051: Transactions List

Every posted entry in one table, like his QuickBooks expense list (W05b, Option 1): date, type, payee, account, before GST, GST, total, with filters.

**Client sees:** the sample year's transactions.

## Depends On

- 050

## Implementation

1. Bridge function `transactions.list` with filters (date range, account, kind, text search) and paging for long lists.
2. Table with `DateCell` and `Amount`. Locked rows show "Locked" (from folder 08).
3. Export of this list waits for 098.

## Check When Done

- 1,000 sample entries scroll smoothly. Filters combine. Totals match the trial balance for a filtered account.
- Impeccable `critique` and `audit`. `npm run check` passes.
