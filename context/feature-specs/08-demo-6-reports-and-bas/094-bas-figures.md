# 094: BAS Worksheet Figures

G1, 1A and 1B for a BAS period, on his GST basis, from the BAS labels.

**Client sees:** nothing yet.

## Depends On

- 093

## Decide First

- Client question 3 (cash or accrual). Assumption: cash.

## Implementation

1. `src/domain/bas.ts` (pure): sums of `bas-labels` for the period. Cash basis counts payments in the period. Accrual counts invoices and bills by date (from folder 10).
2. Net GST to pay or refund.

## Check When Done

- Tests against figures worked out by hand for the sample quarter (risk L6). `npm run check` passes.
