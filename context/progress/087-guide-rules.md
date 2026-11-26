# 087: guide-rules-and-reconciling

Spec: [087](../feature-specs/07-demo-5-rules-and-reconcile/087-guide-rules.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- Guides: "Make a bank rule" (new group **Rules**), "Fix a posted transaction" (Your books), "Reconcile an account" (Bank), with three sample-data images taken from the built app at 1440.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- The guides validate and every image exists. The steps were followed in the built app by the driving script.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
