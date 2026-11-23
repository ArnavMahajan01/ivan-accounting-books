# 032: Accounts and the Default Chart

Spec: [032](../feature-specs/03-ledger-core/032-accounts.md)
Status: Done, with the template waiting for the author's review
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- Migration `0003-accounts.sql`: an `account` table with a unique code, name, type, optional parent, a default tax code column, an active flag and timestamps. `default_tax_code_id` has no foreign key yet, because SQLite will not use a table that does not exist. Migration `0005` (spec 034) adds the key.
- `src/domain/accounts.ts` (the `Account` type) and `src/domain/chart-template.ts`: a default chart of **39 accounts** for a small Australian company in a trade (assets 1000 to 1450, liabilities 2000 to 2900, equity 3000 to 3200, income 4000 to 4200, expenses 5000 to 6160). It has a bank account and a savings account, one `GST` account, PAYG withholding payable, owner drawings, share capital, retained earnings, and a `Suspense` account. Parent and sub-account support is in the schema and the code, and the template uses none.
- `src/data/account-repository.ts`. `setupBusiness` now creates the template in the same transaction as the business.
- `ID_KINDS` gained `tax` and `aud`.

## Verified

- `npm run check` passes (386 tests). New: `src/domain/chart-template.test.ts` (30 to 40 accounts, unique codes and names, each type in its usual range, the accounts the spec names) and extra cases in `setup-business.test.ts`: the chart is present after setup, nothing is created when setup is refused, a repeated code is refused by the database, and a failure while creating accounts rolls the business back too.
- **Not ticked: "The author has reviewed the template (date in the progress file)".** The list is in `src/domain/chart-template.ts`. The author has not reviewed it yet.

## Notes

- **One GST account, not two.** The skill's worked examples show GST collected and GST paid as two accounts. The spec names one "GST" account, and spec 038 speaks of "the GST account", so the template has one liability account: collected is a credit, paid is a debit, and the balance is what is owed (credit) or refundable (debit). The BAS figures come from the lines' tax codes and GST amounts, not from separate accounts.
- `Suspense` is a liability. The author or the accountant may want it as an asset, or to add "uncategorised" accounts like QuickBooks has.
- Fixed a test that assumed the real migrations were few: `src/data/pre-migration-copy.test.ts` looked for a page to damage in a fixed range of the file, which the real tables pushed past. It now tries every page.
