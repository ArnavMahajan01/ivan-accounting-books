# 091: Balance Sheet Screen

The balance sheet as at a date.

**Client sees:** the sample balance sheet.

## Depends On

- 090

## Implementation

1. As-at date picker, grouped assets, liabilities and equity, with the check that assets equal liabilities plus equity shown in words.

## Check When Done

- It balances for every month end of the sample year. `npm run check` passes.
