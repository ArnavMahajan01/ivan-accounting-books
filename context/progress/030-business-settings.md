# 030: Business Settings

Spec: [030](../feature-specs/03-ledger-core/030-business-settings.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- Migration `0002-business.sql`: a `business` table that holds one row (id is always 1), with name, ABN, GST registered, GST basis (`cash` or `accrual`), BAS frequency (`monthly` or `quarterly`) and a nullable lock date. The database refuses a blank name, an ABN that is not 11 digits, and any other basis or frequency.
- `src/domain/abn.ts`: `parseAbn` takes an ABN with or without spaces and returns its 11 digits, or `not-11-digits` or `bad-check-digits`. The rule is the Australian Business Register's: subtract 1 from the first digit, weight the digits 10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, and the total must divide by 89.
- `src/data/business-repository.ts` (rows checked with Zod, through the new `src/data/row-types.ts`), and `GST_BASES` and `BAS_FREQUENCIES` in `kinds.ts`.
- `src/services/setup-business.ts`: `setupBusiness` makes the row in one transaction, and refuses to run twice (`already-set-up`), with a blank name (`empty-name`) or a bad ABN (`bad-abn`). It takes the service inputs from a new `ServiceContext` (`db`, `clock`, `random`) in `src/services/context.ts`, and `src/services/test-context.ts` builds a throwaway one for tests.
- `Db` (the open books' type) is exported from `src/data/database.ts`, because only `data` may import `better-sqlite3`.

## Verified

- `npm run check` passes. New tests: `src/domain/abn.test.ts` and `src/services/setup-business.test.ts`. Setup works once. The second call returns `already-set-up` and the stored business is unchanged. A bad ABN and an empty name are refused and nothing is saved. The database's own CHECK rules are tested with raw inserts.
- **ABN source:** abr.business.gov.au "Format of the ABN" (https://abr.business.gov.au/Help/AbnFormat), read through search results on 2026-11-23. The page's worked example, 51 824 753 556, totals 534 = 6 x 89, and I worked the weights out by hand against that example before writing the code.

## Notes

- The spec says the ABN is "stored as entered digits". The service accepts spaces and stores the 11 digits without them.
- The test and sample ABN is invented (it passes the check digits and belongs to no one). The Australian Business Register's example number is used only in the ABN rule's own test.
