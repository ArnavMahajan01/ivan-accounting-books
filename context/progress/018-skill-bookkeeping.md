# 018: Skill: Australian Bookkeeping Rules

Spec: [018](../feature-specs/01-agent-skills/018-skill-bookkeeping.md)
Status: Done, with one limit on how the sources were read (below)
Date: 2026-11-22
Branch: feature/01-agent-skills

## What was done

- `.claude/skills/au-bookkeeping-rules/SKILL.md`:
  - **Triggers:** `src/domain/`, "GST", "BAS", "journal", "debit", "credit", "financial year", "tax code", "G1", "1A", "1B", "reconcile", "trial balance".
  - **Sign convention:** positive debit, negative credit, an entry sums to zero, normal side by `AccountType`, posting service only.
  - **Five worked examples with invented amounts:** a $1,100 sale, a $550 purchase, a $15 bank fee with no GST, a $2,000 transfer, and a $2,200 invoice with its payment. That makes six entries, each a table of signed cents.
  - **GST:** the rate and one eleventh, registration threshold, taxable, GST-free and input taxed, the $82.50 tax invoice rule, the ATO rounding rule. Also how the project does the maths (spec 035), and the four seeded codes (`GST`, `FRE`, `INP`, `N-T`, spec 034) as data.
  - **Simpler BAS:** under $10 million, G1, 1A and 1B only, and G1 includes all sales. Labels are data (specs 034, 036), and the app never lodges.
  - **Periods:** 1 July to 30 June, monthly, quarterly or annual reporting with the $20 million monthly rule, the quarterly due dates, 5-year records, and the lock.
  - **Cash or accruals:** eligibility and what it changes.
  - **A "never" list:** no tax advice, no rule change without a source and date, no guessed label or code (a client question instead), no 10% of an inclusive amount, no floats, no unbalanced entry, day-first dates, no January year, no ATO connection.
  - `## Links`.
- `context/client-questions.md`: question 27, for the accountant. If an invoice has several lines, is GST worked out on the total or per line (the ATO allows either)? Safe assumption: invoices from the Admin Dashboard keep their own GST.
- `.claude/skills/README.md`: a row for it.

## Verified

- **Each tax fact has a source and a date:** a script read the skill's four fact tables. All 12 facts link an `https://www.ato.gov.au/` page, and every table is headed "checked 2026-11-22".
- **Each example balances to zero:** the same script added every entry's cents: `[110000, -100000, -10000]`, `[50000, 5000, -55000]`, `[1500, -1500]`, `[200000, -200000]`, `[220000, -200000, -20000]`, `[220000, -220000]`. All six are 0.
- **The GST arithmetic in the skill:** 110000 / 11 = 10000, 55000 / 11 = 5000, 220000 / 11 = 20000, 1999 / 11 = 181.73 (so 182), 1005 / 11 = 91.36 (so 91).
- This session's skill list picked up `au-bookkeeping-rules`.

**The limit:** ato.gov.au answered the fetch tool with HTTP 403 (it refuses automated fetches), and no attempt was made to get around that. Each fact was instead checked through web search results limited to ato.gov.au. Those results quote the page and give its URL, but the full pages were not read. The skill says so at the top. Spec 034 checks them again, and the author or the accountant should open the linked pages in a browser to confirm them.

## Notes

- Two ATO details were worth keeping:
  - Exactly half a cent can never occur when taking one eleventh of a whole number of cents, so the half-rounding rule matters only when adding 10% to an exclusive amount.
  - The ATO says it is moving some businesses to the correct GST reporting and accounting methods from 1 July 2026, a reminder that the client's settings must come from his accountant.
- Which code a bank fee takes is left to the accountant. Example 3 shows only an amount with no GST.
