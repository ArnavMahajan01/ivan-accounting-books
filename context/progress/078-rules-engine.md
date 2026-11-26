# 078: Rules: Data and Matching

Spec: [078](../feature-specs/07-demo-5-rules-and-reconcile/078-rules-engine.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- Migration `0011-rules-and-reconcile.sql`: `rule` (order, direction, bank accounts as JSON, all/any, conditions as JSON, one account or a split by percentage, payee, post by itself, on/off), `reconciliation`, and `statement_line.reconciliation_id`.
- `src/shared/rule-types.ts` (the shapes, shared with the screens) and `src/domain/rules.ts` (pure): description contains / is / starts with (capitals and extra spaces ignored), amount equals / between (without its sign), all or any, one account or every account, first active rule by order wins; `shareByPercent` (whole cents, the rest to the last part); `ruleProblems`.
- `src/data/rule-repository.ts`: every row read back through Zod, JSON included.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- `src/domain/rules.test.ts` (22): each condition, order, all versus any, one account, off rules, sharing to the cent, validation.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
