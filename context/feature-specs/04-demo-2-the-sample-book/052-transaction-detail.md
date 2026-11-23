# 052: Transaction Detail and History Panel

Opening a transaction shows its debits and credits and its history in a side panel (W05b, Option 2).

**Client sees:** what each entry did to the books, and who changed it.

## Depends On

- 051

## Implementation

1. Bridge function `transactions.get(id)`: entry, lines, GST, source, audit history.
2. A side panel beside the list, closed with Escape.

## Check When Done

- A sample entry shows lines that sum to zero and its "Posted" history row.
- `npm run check` passes.
