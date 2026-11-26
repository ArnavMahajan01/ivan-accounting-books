# 086: Reconcile Screen

Spec: [086](../feature-specs/07-demo-5-rules-and-reconcile/086-reconcile-screen.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `src/renderer/bank/ReconcileSheet.tsx`: Reconcile beside each account on the Bank page; date and closing balance filled from the last import; statement, books, difference; the difference in words and the waiting lines with a link to To review; Finish only at zero; then "Business One ··4821 is reconciled to 20/11/2026."

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- e2e: the packaged app's self-check reconciles Business One to zero, filled in from the import. Screen test and layout sweep.
- Impeccable `critique` and `audit` were not run: the author asked to skip the Impeccable passes for folders 07 and 08. The screens were looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
