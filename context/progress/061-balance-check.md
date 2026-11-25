# 061: Closing Balance Check

Spec: [061](../feature-specs/05-demo-3-bank-import/061-balance-check.md)
Status: Done (the rule is the author's to confirm)
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/domain/balance-check.ts` (pure): from the balance the imported lines already give, the new lines, the file's closing balance and the lines that could not be read, it returns `match`, `difference` (with whether the unreadable lines are exactly the difference), `first-file`, `no-starting-point`, or `no-closing-balance`.
- **The spec left the meaning open ("the account's balance before"), so it is recorded in `architecture-context.md` ("Importing A Bank File") for the author to confirm.** It checks the stream of imported lines, not the ledger: each batch stores an opening balance (the closing balance less every line the file lists), and a later file is checked against that opening balance plus every imported line up to its last day. The first file has nothing to compare with. Reconciling to the ledger is folder 07.

## Verified

- `src/domain/balance-check.test.ts`: 7 tests: a match, no new lines, a difference equal to one rejected line and to the sum of two, a difference that a rejected line does not equal, an unreadable rejected amount, the first file, no starting point, no closing balance.
- In the service tests: the overlap file matches ($18,642.35), the problem file differs by $100.00 and says the unreadable line is why, and a file older than the first one imported says it cannot be checked.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- The wireframe shows "Closing balance matches" for a clean first file. Here the first file says "First file for this account" instead, because there is nothing earlier to match. The tick appears from the second file.
