# 045: Ledger Core Verification

Checks the ledger core end to end before anything is built on it.

**Client sees:** nothing. Internal.

## Depends On

- 044

## Implementation

1. Run `npm run check`, `npm run package`, `npm run test:e2e`, and record the results.
2. Run `check-invariants`. Record each invariant as checked, not applicable yet, or failing.
3. In `security-risks.md`, mark L1, L2 and L4 fixed with their spec numbers if passed.

## Check When Done

- All commands pass. No invariant is failing. The risk register's "last reviewed" date is updated.
