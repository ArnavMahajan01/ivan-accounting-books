# 079: Rules List Screen

Spec: [079](../feature-specs/07-demo-5-rules-and-reconcile/079-rules-list.md)
Status: Done
Date: 2026-11-26
Branch: feature/07-demo-5-rules-and-reconcile

## What was done

- **Rules** in the sidebar after Reports (as `ui-context.md` planned), Command-7. Settings moved from Command-9 to **Command-comma**, the Mac's own Settings key, because it is now the tenth page; Accountant changes is Command-9. Getting started says so.
- `src/renderer/pages/RulesPage.tsx`: order (arrows, or Option with up or down on a row), rule, bank accounts, when, then, post by itself, On, Edit. Search. A **Rules** button on To review.
- To review: a rule comes before a guess from past lines, and says **from your rule**; a split rule shows its parts and posts them all (`applyRule`, a new `rule` action).
- The sample books have three invented rules (Timberlink, the Westpac fee, a 70/30 phone split), none posting by itself; they are made last, so the sample entries keep their ids.

## Verified

- `npm run check` (typecheck both configs, lint, 94 test files, 1,092 tests), `npm run format:check`, `npm run test:layout` (now also Rules, the rule panel, New account and Reconcile, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also reconciles Business One) pass on 2026-11-26.
- Service test: a new order is saved and changes which rule wins in To review. Screen tests: the list, arrows, Option-up, On. Built app: Option-up moved Total above Phone and internet.
- "Order changes … (e2e)": tested through the services and in the built app by a driving script, not in the packaged e2e.
- Impeccable `critique` and `audit` were not run: the author asked to skip the Impeccable passes for folders 07 and 08. The screens were looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 07 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
