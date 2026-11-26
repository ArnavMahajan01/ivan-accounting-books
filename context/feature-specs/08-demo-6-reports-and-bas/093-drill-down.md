# 093: Lines Behind a Figure

Every figure in a report opens the lines that make it up.

**Client sees:** clicking a figure shows its transactions.

## Depends On

- 092

## Implementation

1. Each report figure is a button opening a sheet with the lines (date, payee, before GST, GST, total), the total, and "Open in Transactions".

## Check When Done

- The sheet's total always equals the figure clicked (test). Keyboard reachable.
