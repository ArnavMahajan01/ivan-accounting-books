# 089: Report Figures by Account and Period

The sums every report is built from, for any period and comparison periods.

**Client sees:** nothing yet.

## Depends On

- 088

## Implementation

1. A query for totals per account per period (several periods in one call, for comparison columns).
2. `src/domain/reports/` (pure): shapes for profit and loss (income, expenses, net profit), balance sheet (assets, liabilities, equity, current year earnings), trial balance.

## Check When Done

- Tests with the sample set: the balance sheet balances, net profit equals the change in equity, hand-worked totals match.
