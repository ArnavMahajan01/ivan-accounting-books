# 030: Business Settings

Stores the business's settings in one place: name, ABN, GST registration and basis, BAS frequency, and the lock date.

**Client sees:** nothing yet. Settings screens come in folder 11.

## Depends On

- 029, on branch `feature/03-ledger-core`

## Implementation

1. Migration: a `business` table with one row: name, ABN, GST registered, GST basis (`cash` or `accrual`), BAS frequency (`monthly` or `quarterly`), lock date (nullable).
2. `src/data/` repository with Zod validation. Add `GstBasis` and `BasFrequency` to `kinds.ts`.
3. `src/services/setup-business.ts`: creates the row, refuses to run twice.

## Rules And Edge Cases

- ABN is stored as entered digits, 11 of them, checked with the ABN check-digit rule (source recorded from abr.gov.au with the date).

## Check When Done

- Tests: setup works once, the second time returns an error and changes nothing. A bad ABN is refused.
- `npm run check` passes.
