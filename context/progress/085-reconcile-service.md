# 085: Reconcile Service

Spec: [085](../feature-specs/07-demo-5-rules-and-reconcile/085-reconcile-service.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `src/services/reconcile.ts`: the books' balance on the statement day from posted lines; the difference; the waiting lines that explain it (lines that already match an entry are left out, because the books hold them); `explainedByWaiting`. Finish only at zero, never on or before the last reconciled day; the lines it covered are marked. Undo of a covered line is refused ("reconciled"). The Bank page shows "reconciled to".

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Tests: balanced and finished; a difference from a waiting line; a difference from a line missing from the books; reconciled line not undone; earlier day refused. Sample books: Business One agrees on 20 November; on 23 November the 12 Demo 4 lines explain the difference exactly.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
