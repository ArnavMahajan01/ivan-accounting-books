# 034: Tax Codes

Spec: [034](../feature-specs/03-ledger-core/034-tax-codes.md)
Status: Done, with the defaults waiting for the author's review
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- Migration `0005-tax-codes.sql`: a `tax_code` table (id, short code, name, treatment, rate in basis points, active). It seeds `GST` (taxable, 1000), `FRE` (GST-free), `INP` (input taxed) and `N-T` (outside GST), with fixed ids `tax_gst`, `tax_fre`, `tax_inp`, `tax_nt`. A rate is allowed only on a taxable code. The migration also adds the real foreign key from `account.default_tax_code_id`. SQLite can add a foreign key only with a new column, so it drops the empty column and adds it back.
- `src/domain/tax-codes.ts`, `src/data/tax-code-repository.ts`, `TAX_TREATMENTS` in `kinds.ts`. Code branches on `treatment`, never on the short code text.
- Every template account now has a `defaultTax`, and `setupBusiness` sets each account's default tax code.

## Verified

- `npm run check` passes (403 tests). `src/data/tax-code-repository.test.ts`: the four seeds, the rules on the table, the foreign key now enforced, and a test that applies migrations 1 to 4, adds accounts (one under another), runs 5, and checks every account is kept.
- **ATO sources, checked 2026-11-23** (through search results limited to ato.gov.au, because the ATO site refuses automated fetches, so the pages were not read in full):
  - GST is a broad-based tax of 10%: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst
  - Simpler BAS, for a business under $10 million, reports G1, 1A and 1B only: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/simpler-bas-gst-bookkeeping-guide
  - G1 includes taxable, GST-free and input-taxed sales, and the filer states whether it is GST-inclusive or exclusive. 1A is the GST in taxable sales only. 1B is the GST credit on purchases, and credits can be claimed only for purchases that relate to taxable or GST-free sales. (Same guide, and its "Step 1: Sales" page.)
- **Not ticked: "The author reviews the defaults".** They are in `src/domain/chart-template.ts` (`defaultTax`). The two to look at hardest: Bank fees and Interest paid are `INP` (input taxed), and Interest income is `INP`. Wages, superannuation and depreciation are `N-T`. Everything else with GST in its price is `GST`.

## Notes

- `N-T` and "outside GST" are the app's words for lines GST never touches (transfers, wages, loans, equity). They are not an ATO treatment, and they feed no BAS label.
- The ATO's rule that a credit is only for purchases related to taxable or GST-free sales is **not** modelled per line: a purchase with GST feeds 1B whatever it relates to. The BAS worksheet (spec 094) must handle purchases that relate to input-taxed income, for example interest.
