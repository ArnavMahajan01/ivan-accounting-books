# 081: Rules That Post by Themselves

Spec: [081](../feature-specs/07-demo-5-rules-and-reconcile/081-auto-post.md)
Status: Done (Home not changed)
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `postByRules`: after an import is committed, each new line a "post by itself" rule fits is posted through `applyRule` (the posting service, its checks and audit rows), each in its own transaction. A line that matches an entry already in the books is left for him. A locked period or an inactive account is skipped and reported. Entry matching moved to `services/line-matches.ts` so both places use it.
- The import sheet: "3 lines were posted by your rules." with Undo, and how many could not be posted.
- **Not done:** Home does not show the number (the spec asks for the import result **and** Home). Recorded in Follow-ups.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Tests: posted with audit rows and undoable, locked skipped, inactive account skipped, a rule that does not post by itself left. Sample books: the Demo 5 file posts 3 lines by rules. Built app: "1 line was posted by your rules." with Undo.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
