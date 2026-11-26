# 084: Manage Accounts on Screen

Spec: [084](../feature-specs/07-demo-5-rules-and-reconcile/084-accounts-edit.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- Accounts page: **New account** (name, code, type, sits under, usual GST) and **Edit** on every row (name and code; **Stop using this account**, which says its posted transactions stay, or **Use this account again**). `editAccount` checks the code before writing anything, so a refused code never leaves a new name behind.
- "Clean up" (W05b Option 5) left for a later spec, as the spec says.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Screen tests: add with usual GST; the warning on an account with posted lines. Layout sweep: the New account sheet at four sizes.
- "e2e: add, rename, deactivate": covered by service and screen tests, not the packaged e2e.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
