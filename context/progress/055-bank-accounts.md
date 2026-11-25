# 055: Bank Accounts

Spec: [055](../feature-specs/05-demo-3-bank-import/055-bank-accounts.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `addBankAccount` now takes an optional `parentId`, so a sub-account sits under another bank account (client question 4). One level only: a sub-account of a sub-account is refused (`parent-is-a-sub-account`), and so is a parent that does not exist.
- `src/services/manage-bank-accounts.ts`: `renameBankAccount` and `deactivateBankAccount`, each in one transaction with an audit row (`bank-account.rename`, `bank-account.deactivate`). A blank or unchanged name, an unknown account and an account already inactive are refused with no audit row. An account with active sub-accounts cannot be deactivated.
- `src/data/bank-account-repository.ts`: `getBankAccountById`, `updateBankAccount` (the name and the active flag only).
- The sample set already had its two accounts (spec 046).

## Verified

- `src/services/contacts-and-bank-accounts.test.ts`: 11 tests, 5 of them new, for rename (old and new name in the audit row), refusals (no audit row), deactivate once, a sub-account one level deep, and no deactivating a parent with active sub-accounts.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- Not built, because the spec did not ask: reactivating a bank account. An inactive account cannot yet come back. There is no screen for any of this until the Bank accounts card in Settings (spec 133).
- Only the last four digits of an account number are ever stored.
