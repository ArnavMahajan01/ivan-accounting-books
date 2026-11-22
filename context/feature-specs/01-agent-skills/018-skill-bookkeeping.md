# 018: Skill: Australian Bookkeeping Rules

Keeps a model from inventing accounting or tax rules: this project's double entry, GST, BAS periods and the financial year, each tax fact checked on ato.gov.au.

**Client sees:** nothing. Internal.

## Depends On

- 015

## Implementation

1. `.claude/skills/au-bookkeeping-rules/SKILL.md`. Triggers: `src/domain/`, "GST", "BAS", "journal", "debit", "credit", "financial year", "tax code".
2. The sign convention: positive is a debit, negative a credit, an entry sums to zero. Worked examples with invented amounts: a sale, a purchase, a bank fee, a transfer, an invoice payment.
3. GST facts: the rate, one eleventh of an inclusive amount, the tax codes, which simpler BAS labels each feeds. Each with its ato.gov.au page and date.
4. Periods: 1 July to 30 June, monthly and quarterly BAS, cash versus accrual.
5. A "never" list: never give tax advice, never change a tax rule without a source, never guess a BAS label. Unknown rules become client questions.

## Check When Done

- Each tax fact has a source and a date. Each example balances to zero.
