# 034: Tax Codes

The GST codes as data, attached to accounts as defaults.

**Client sees:** nothing yet.

## Depends On

- 033

## Implementation

1. Check on ato.gov.au, and record page and date: the GST rate, the treatments (taxable, GST-free, input taxed, outside GST), and the simpler BAS labels G1, 1A, 1B.
2. Migration: `tax_code` (id, short code, name, treatment, rate in basis points, active). Seed `GST` (1000), `FRE`, `INP`, `N-T`. Code branches on `treatment`, never on the short code text.
3. Fill each template account's default tax code. The author reviews the defaults.

## Check When Done

- Tests: seeds present, defaults set. The ATO sources are in the progress file. `npm run check` passes.
