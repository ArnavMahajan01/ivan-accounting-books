# 042: Balances and Trial Balance

Spec: [042](../feature-specs/03-ledger-core/042-balances.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/data/balance-queries.ts`: each account's total over a range, with SQL `SUM` over whole cents, rows checked with Zod. `src/domain/balances.ts`: `buildTrialBalance` (pure) gives the rows with a balance, in code order (net debit in one column, net credit in the other), the two totals, and `balanced`. An account that nets to zero is left out. `src/services/get-trial-balance.ts`: `getTrialBalance(ctx, { from, to })` returns a `Result`, with `range-ends-before-it-starts` for a bad range. Both ends are included, and null means no limit.
- Services that only read take a new `ReadContext` (`db`).

## Verified

- `npm run check` passes (513 tests). `src/services/get-trial-balance.test.ts` posts a five-entry invented year worked out by hand (capital, a sale with GST, timber with GST, a bank fee, a transfer) and matches it to the cent: all dates (bank 853,500, savings 200,000, GST credit 5,000, capital 1,000,000, sales 100,000, materials 50,000, fees 1,500; both totals 1,105,000), August only (56,500 each side), and a single day. It also tests a range cutting through entries, an empty book, 40 more entries all balancing, a bad range, and that a corrupted line shows as not balanced.

## Notes

- Whether a zero-balance account should show on the trial balance (QuickBooks shows them) is the screens' choice later (spec 050).
