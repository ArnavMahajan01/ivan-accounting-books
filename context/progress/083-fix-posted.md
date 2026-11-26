# 083: Change the Account on Posted Transactions

Spec: [083](../feature-specs/07-demo-5-rules-and-reconcile/083-fix-posted.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `src/services/fix-entry.ts`: an entry with one bank line and one account is rebuilt for the new account, GST worked out again from its usual code, and saved with `changeEntry` (same id, history, audit row). Move to: each separately.
- Transactions: the account's name with **Change** (the picker opens on asking, so the table still fits at 1100 wide); **Select**, then tick and **Move N to…**. Locked rows keep "Locked" and have no Change. A row says whether it can be moved (`movable`).

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Tests: change with GST recalculated and history kept; move many with one refused (a split); locked refused. Screen test: Change and Move. History panel shows Posted and Changed.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
