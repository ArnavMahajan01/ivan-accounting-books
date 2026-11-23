# 036: BAS Labels

Spec: [036](../feature-specs/03-ledger-core/036-bas-labels.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/domain/bas-labels.ts`: `basContributions(line)` takes a line's account type, tax treatment, net amount and GST (signed as the journal stores them) and returns what it adds to G1, 1A and 1B. A taxable sale gives G1 the whole amount including GST, and 1A the GST. GST-free and input-taxed sales give G1 only. A taxable purchase gives 1B the GST. A refund gives negative figures. Transfers, equity, loans and outside-GST lines give nothing. `BAS_LABELS` is in `kinds.ts`.
- Only the simpler BAS (G1, 1A, 1B), as the spec says. G1 is reported GST-inclusive, which the ATO allows the filer to choose.

## Verified

- `npm run check` passes (437 tests). `src/domain/bas-labels.test.ts` has a test for each case the spec lists (a sale, a purchase, a GST-free sale, an input-taxed sale, a transfer, a refund), plus a refund of a purchase, an asset bought, a one cent sale, and a whole entry added up to G1 110000 and 1A 10000.
- Sources: the ATO pages in the progress file for 034.

## Notes

- **Client question 28 added:** the GST on selling a business asset. A taxable credit to an asset account feeds no label for now, and the BAS worksheet (spec 094) must list such lines and not drop them. I did not read the ATO page for that case, and did not guess.
