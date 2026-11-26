# 082: "Do This Every Time?" After Posting

Spec: [082](../feature-specs/07-demo-5-rules-and-reconcile/082-rule-from-line.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `ruleOfferFor`: after he posts one line with an account, when no rule fits it and lines with the same words have gone to the same account at least twice, a rule filled in from it (the first word of 4 or more letters, money in or out, the account, GST code and payee).
- To review's message: "Do this every time for "BUNNINGS"?" with **New rule from this line** (the Rules page opens with the panel filled in) and **Not now**.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Tests for when it is offered and not. Built app: offered after the second TOTAL TOOLS line, and the panel came filled in.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
