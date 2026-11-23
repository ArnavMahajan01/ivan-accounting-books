# 036: BAS Labels

Maps each posted line to the simpler BAS label it feeds, so the BAS worksheet is a sum, not a guess.

**Client sees:** nothing. Internal.

## Depends On

- 035

## Implementation

1. `src/domain/bas-labels.ts`: from account type, tax treatment, gross amount and GST, return the labels: G1 (sales including GST), 1A (GST on sales), 1B (GST on purchases).
2. Tests: a sale, a purchase, a GST-free sale, an input-taxed sale, a transfer, a refund.

## Scope Limits

- Simpler BAS only. Full labels wait for a client question. PAYG labels W1 and W2 only with F07.

## Check When Done

- Every case above is a test. `npm run check` passes.
