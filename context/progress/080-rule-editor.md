# 080: Rule Editor With Test

Spec: [080](../feature-specs/07-demo-5-rules-and-reconcile/080-rule-editor.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- `src/renderer/rules/RuleEditor.tsx`: the Edit rule panel (name; money in/out/both in all or one bank account; conditions with + Condition and all/any; account and GST, or + Add a split with percentages; payee from contacts; post by itself; Test with See them; Delete with a confirmation; Save). `rule-text.ts` turns the form into a rule and says what is wrong in words, such as "The split must add up to 100%. It adds up to 90%."
- Services `saveRule`, `testRule`, `setRuleActive`, `moveRule`, `removeRule`, each with an audit row; a bank account or Transfers in transit can never be a rule's account.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Validation tests (domain, service and form). Screen test: make a rule, Test says "matches 9 lines in To review and 41 posted lines", Save sends it. Built app: Test said "matches 1 line in To review and 2 posted lines".
- "e2e: make a rule, see waiting lines change": done in the built app by a driving script and in service tests, not in the packaged e2e.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
