# 042: Balances and Trial Balance

Each account's balance and the trial balance for any date range, always worked out from journal lines.

**Client sees:** nothing yet. Shown in Demo 2.

## Depends On

- 041

## Implementation

1. A query summing line amounts per account for a date range, with SQL `SUM` over integers, validated rows.
2. `src/domain/balances.ts`: builds the trial balance (accounts, debit or credit totals, grand totals, balanced or not). Pure.
3. `src/services/get-trial-balance.ts` returns it as a `Result`.

## Check When Done

- Tests: an empty book, a hand-worked set of entries matching to the cent, a date range cutting through entries.
- Debits equal credits in every test. `npm run check` passes.
