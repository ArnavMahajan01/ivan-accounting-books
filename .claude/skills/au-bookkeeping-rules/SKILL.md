---
name: au-bookkeeping-rules
description: Australian bookkeeping rules for Accounting Books - double entry with signed cents, GST (rate, one eleventh, rounding, tax codes), the simpler BAS labels, BAS periods, the 1 July financial year and cash versus accrual. Each tax fact has its ato.gov.au source. Use when editing src/domain/, or when the task mentions "GST", "BAS", "journal", "debit", "credit", "financial year", "tax code", "G1", "1A", "1B", "reconcile" or "trial balance".
---

# Australian Bookkeeping Rules in Accounting Books

This skill keeps a model from inventing accounting or tax rules. It is not tax advice, and the app gives none. Rules in `context/architecture-context.md` (the invariants) and `context/code-standards.md` ("Money", "GST") win over this file.

**Before using any tax fact below, check it is still current on ato.gov.au.** Thresholds and dates change. Each fact gives its page.

## How the facts were checked

On 2026-11-22. ato.gov.au refuses automated page fetches (HTTP 403), so each fact was checked through web search results restricted to ato.gov.au, which quote the page named. The pages themselves were not read in full. Spec 034 reads them again before the tax codes are seeded, and the author or the accountant confirms them in a browser.

## Double entry, as this project stores it

- Every journal line has an amount in **integer cents** (`Cents`, `src/shared/money.ts`). **Positive is a debit, negative is a credit.**
- **The lines of an entry sum to zero** (invariant 1). An entry that does not is refused, never "fixed" by a balancing line the client did not ask for.
- Account types and their normal side: asset and expense are debits (positive). Liability, equity and income are credits (negative). The types are `AccountType` in `src/shared/kinds.ts`.
- Only the posting service writes journal lines, with an audit row in the same transaction (invariant 3).

### Worked examples

All amounts are invented, for the sample business "Harbour Lane Joinery Pty Ltd". Each entry sums to zero.

**1. A sale of $1,100 including GST, paid into the bank.** GST is one eleventh: 110000 / 11 = 10000 cents.

| Account | Cents |
|---|---|
| Business cheque account (asset) | +110000 |
| Sales (income) | -100000 |
| GST collected (liability) | -10000 |
| **Sum** | **0** |

**2. Timber bought for $550 including GST, paid from the bank.** GST credit 55000 / 11 = 5000 cents.

| Account | Cents |
|---|---|
| Materials (expense) | +50000 |
| GST paid (asset: the credit to claim) | +5000 |
| Business cheque account (asset) | -55000 |
| **Sum** | **0** |

**3. A $15 monthly account fee charged by the bank, with no GST in it.** Which code a bank fee takes is the accountant's call. This example only shows an amount with no GST.

| Account | Cents |
|---|---|
| Bank fees (expense) | +1500 |
| Business cheque account (asset) | -1500 |
| **Sum** | **0** |

**4. $2,000 moved from the cheque account to the savings account.** Outside GST: no sale, no purchase. Reports show it as a pair (both sides of one transfer).

| Account | Cents |
|---|---|
| Business savings account (asset) | +200000 |
| Business cheque account (asset) | -200000 |
| **Sum** | **0** |

**5. An invoice for $2,200 including GST, then its payment.** Two entries.

Invoice issued:

| Account | Cents |
|---|---|
| Accounts receivable (asset) | +220000 |
| Sales (income) | -200000 |
| GST collected (liability) | -20000 |
| **Sum** | **0** |

Payment received:

| Account | Cents |
|---|---|
| Business cheque account (asset) | +220000 |
| Accounts receivable (asset) | -220000 |
| **Sum** | **0** |

On the cash basis, the GST in example 5 is reported in the BAS period when the payment arrives. On the non-cash (accruals) basis, it is reported in the period of the invoice (see "Cash or accruals" below).

## GST facts

| Fact | Source (ato.gov.au, checked 2026-11-22) |
|---|---|
| The GST rate is 10%. GST is one eleventh (1/11) of a GST-inclusive price | [How Australian GST works](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-australian-gst-works). For working out the GST in a price: [When you can claim a GST credit](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/claiming-gst-credits/when-you-can-claim-a-gst-credit) ("dividing the price by 11") |
| A business must register for GST at a GST turnover of $75,000 or more ($150,000 for a non-profit), within 21 days | [Registering for GST](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst) |
| Taxable sales include GST, and credits can be claimed for related purchases. GST-free sales have no GST, and credits can still be claimed. Input-taxed sales (for example financial supplies, residential rent) have no GST, and **no** credits can be claimed for related purchases | [When to charge GST (and when not to)](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-to-charge-gst-and-when-not-to), [Input-taxed sales](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-to-charge-gst-and-when-not-to/input-taxed-sales), [GST definitions](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/definitions) |
| A tax invoice is needed to claim a GST credit on a purchase over $82.50 including GST | [When you can claim a GST credit](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/claiming-gst-credits/when-you-can-claim-a-gst-credit) |
| Rounding: with one taxable sale on a tax invoice, GST is rounded to the nearest cent, 0.5 of a cent rounded up. For several sales on one invoice there are two allowed methods (total the invoice then round, or work out each sale then round the total) | [Tax invoices](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices) |

### How this project does the maths

- The rate is one constant in `src/domain/gst.ts` (spec 035). Code never writes `10` or `0.1` elsewhere.
- GST in an inclusive amount is `cents / 11`, rounded to the nearest cent, with exactly half rounded away from zero, which matches the ATO's "0.5 rounded up" for positive amounts (spec 035 tests it). A whole number of cents divided by 11 never ends in exactly half a cent, so the half case only arises when adding 10% to an exclusive amount (for example 105 cents gives 10.5, so 11).
  - Example: $19.99 is 1999 / 11 = 181.73, so 182 cents of GST. $10.05 is 1005 / 11 = 91.36, so 91.
- Which invoice rounding method applies (total first, or per sale) is client question 27. Invoices come from the Admin Dashboard (specs 125, 126), and their GST is taken as issued, not recalculated.
- **Tax codes are data**, in the `tax_code` table (spec 034): `GST` (taxable, 1000 basis points), `FRE` (GST-free), `INP` (input taxed) and `N-T` (outside GST). Code branches on the `treatment`, never on the short code text. The default code for each account is reviewed by the author, and the client's real codes by his accountant.

## The simpler BAS

| Fact | Source (ato.gov.au, checked 2026-11-22) |
|---|---|
| A small business with GST turnover under $10 million uses the simpler BAS by default, and reports only **G1 Total sales**, **1A GST on sales** and **1B GST on purchases**. At $10 million or more, the full method adds G2, G3, G10 and G11 | [GST reporting methods](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/gst-reporting-methods), [Simpler BAS GST bookkeeping guide](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/simpler-bas-gst-bookkeeping-guide) |
| G1 includes all sales: taxable, GST-free and input taxed | [Step 1: Sales](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/managing-gst-in-your-business/reporting-paying-and-activity-statements/completing-your-bas-for-gst/complete-your-bas/step-1-sales) |

- Which label each tax code feeds is data in the `tax_code` and BAS label tables (specs 034, 036), checked against these pages at that spec. Never guess a label. If a case is not on the ATO page, it is a client question.
- The app prepares a BAS worksheet. **It never lodges.** The accountant lodges (`project-overview.md`, out of scope).

## Periods

| Fact | Source (ato.gov.au, checked 2026-11-22) |
|---|---|
| The income (financial) year runs **1 July to 30 June** | [Preparing your tax return](https://www.ato.gov.au/individuals-and-families/your-tax-return/before-you-prepare-your-tax-return/preparing-your-tax-return) |
| GST is reported monthly, quarterly or annually. Monthly is required at a GST turnover of $20 million or more, and is optional below it. A monthly BAS is due on the 21st of the next month | [Monthly GST reporting](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/lodging-your-bas-or-annual-gst-return/options-for-reporting-and-paying-gst/monthly-gst-reporting), [Quarterly GST reporting](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/lodging-your-bas-or-annual-gst-return/options-for-reporting-and-paying-gst/quarterly-gst-reporting) |
| Quarterly BAS due dates for lodging yourself: Q1 (July to September) 28 October, Q2 (October to December) 28 February, Q3 (January to March) 28 April, Q4 (April to June) 28 July. A due date on a weekend or public holiday moves to the next business day. Agents may have later dates | [Due dates for lodging and paying your BAS](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/due-dates-for-lodging-and-paying-your-bas) |
| Most business records must be kept for 5 years | [Overview of record-keeping rules for business](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/record-keeping-for-business/overview-of-record-keeping-rules-for-business) |

- Financial year and BAS periods are worked out in `src/domain/` from `CalendarDate` strings (spec 031), with `addDays` and `compareDates`. Never with `Date` objects. "FY 2026-27" is 1 July 2026 to 30 June 2027.
- Whether the client reports monthly or quarterly is his setting (spec 030), not a guess. Client questions 1 to 8 cover his set-up.
- Once a BAS period is locked, nothing in it changes (invariant 6, spec 096).

## Cash or accruals

| Fact | Source (ato.gov.au, checked 2026-11-22) |
|---|---|
| A business with aggregated turnover under $10 million (or that accounts for income tax on a cash basis) may account for GST on a cash basis. Otherwise it uses the non-cash (accruals) basis, unless the ATO permits cash. On a cash basis, GST goes in the BAS period when the payment is received or made | [Choosing an accounting method for GST](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/accounting-for-gst-in-your-business/choosing-an-accounting-method) |

- Which basis the client uses is his accountant's answer, stored as a setting. The BAS worksheet follows it.

## Never

- **Never give tax advice** in the app, a guide, a log or a reply: never "you should use cash basis" or "this is GST-free". The app records what the client and his accountant decide.
- **Never change a tax rule, rate, threshold or label without an ato.gov.au source and a date**, recorded in the progress file of the spec that changes it.
- **Never guess a BAS label or a tax code.** If the ATO page does not settle it, add a question to `context/client-questions.md` and ask.
- **Never work GST as 10% of an inclusive amount.** It is one eleventh.
- **Never use floats** for money or GST, and never round anywhere except in the GST helpers.
- **Never post an entry that does not sum to zero**, and never add a balancing line the client did not ask for.
- **Never read `03/04/2026` as 4 March.** Australian dates are day first.
- **Never use a January to December year.**
- **Never connect to the ATO** (no lodging, no ATO APIs). It is out of scope (`CLAUDE.md` hard rule 5).

## Links

- [GST (ATO)](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst)
- [Business activity statements (ATO)](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas)
- [Simpler BAS GST bookkeeping guide (ATO)](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/simpler-bas-gst-bookkeeping-guide)
- [Record keeping for business (ATO)](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/record-keeping-for-business)
