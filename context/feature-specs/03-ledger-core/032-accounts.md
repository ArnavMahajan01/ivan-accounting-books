# 032: Accounts and the Default Chart

The chart of accounts table and a default Australian template, so later specs have accounts to post to.

**Client sees:** nothing yet. Demo 2 shows the chart.

## Depends On

- 031

## Implementation

1. Migration: `account` (id, code, name, type, parent id for sub-accounts, default tax code id nullable until 034, active, timestamps). `code` unique.
2. `src/domain/chart-template.ts`: about 30 to 40 accounts for a small Australian company in a trade (client question 2), including bank accounts with sub-accounts allowed, GST, PAYG withholding payable (unused unless F07), owner drawings, shareholder equity, retained earnings, and a suspense account. The author reviews the list.
3. `setup-business` creates the template accounts in the same transaction.

## Scope Limits

- Not his real chart. That moves from QuickBooks at go-live (146).

## Check When Done

- After setup, the template is present. Two accounts with the same code are refused.
- The author has reviewed the template (date in the progress file). `npm run check` passes.
