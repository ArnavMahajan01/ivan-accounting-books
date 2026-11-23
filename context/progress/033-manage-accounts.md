# 033: Manage Accounts Service

Spec: [033](../feature-specs/03-ledger-core/033-manage-accounts.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/services/manage-accounts.ts`: `addAccount`, `renameAccount`, `changeAccountCode`, `deactivateAccount`, `reactivateAccount`, each in one transaction with one audit row holding the account before and after. Errors are returned as values: `empty-code`, `empty-name`, `code-in-use`, `not-found`, `parent-not-found`, `unchanged`, `already-inactive`, `already-active`. There is no delete and no merge, and a test checks that the module exports only those five functions. Deactivating an account with posted lines is allowed.
- **The audit log table is created here (`0004-audit-log.sql`), not in spec 037.** This spec needs "every change writes an audit row", and 037 comes later. 037's migration creates only the journal tables. `src/data/audit-repository.ts` has an insert and a read, `src/services/audit.ts` has `recordAudit`, and `src/domain/audit.ts` the record type. `AUDIT_KINDS` in `kinds.ts` lists what is audited.
- `setupBusiness` now writes a `business.setup` audit row too.

## Verified

- `npm run check` passes (396 tests). `src/services/manage-accounts.test.ts` covers each action, each refusal (nothing saved, no audit row added), a sub-account under a bank account, the audit rows' before and after, and a change rolling back when its audit row cannot be written.
- Spec 038 checks again that an inactive account is refused by new postings (`validateEntry` and `postEntry` tests).

## Notes

- Changing an account's type or parent is not offered, because it would change what posted lines mean. Say if the client needs it.
