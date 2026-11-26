# 096: Period Lock Service

Spec: [096](../feature-specs/08-demo-6-reports-and-bas/096-lock-service.md)
Status: Done (on question 20's assumption)
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- `lockPeriod(endDate)` in `src/services/quarter-close.ts`: moves the business's lock date forwards only, with a `business.lock` audit row. No unlock (question 20). The posting service already refuses anything on or before it; To review's Undo and rules posting by themselves go through it too (tested in folders 06 and 07).

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Tests: forwards only; post, change and remove refused after locking; a report says it is locked. (Undo and posting by rules in a locked period: `review.test.ts` and `rules.test.ts`.) Built app: 57 July to September rows say Locked after the lock.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
