# 090: Profit and Loss Screen

The profit and loss for a chosen period, with the period picker from the wireframe.

**Client sees:** profit and loss for the sample year.

## Depends On

- 089

## Implementation

1. Period picker: this quarter, last quarter, this financial year, last financial year, custom dates.
2. Grouped by type with totals, net profit at the bottom. `Amount` everywhere.
3. Toolbar actions: Export CSV, Export PDF, Publish to Google Sheets (disabled until those specs, with a tooltip).

## Check When Done

- Figures match `report-figures` tests. Impeccable `critique` and `audit`.
