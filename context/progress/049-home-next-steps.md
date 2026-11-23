# 049: Home: Next Steps List

Spec: [049](../feature-specs/04-demo-2-the-sample-book/049-home-next-steps.md)
Status: Done (Impeccable skill not run)
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- `src/domain/next-steps.ts` (pure): from counts and dates, which jobs to show and in what order: review lines, reconcile (one per account), back up (when there is no backup or the last is over a week old), BAS due (with the days left and whether the period has ended) and the accountant's changes. A job is shown ticked when it is done, so Home can say he is up to date.
- **A job whose feature does not exist yet is not shown.** `AVAILABLE_NEXT_STEPS` in `get-home-summary.ts` lists the jobs the app can do today, and it is empty: review (folder 06), reconcile (07), BAS (08), accountant changes (09) and backup (11) each add theirs. So on the sample books Home's To do box says "You are up to date." and explains that jobs appear when there is something to do.
- `NextStepsList.tsx` and `next-step-text.ts`: one row per job, with a number or a tick, plain words and one button that opens its page. A brand-new book shows the getting-started list instead.

## Verified

- `npm run check` passes. `src/domain/next-steps.test.ts` (8 tests): every job in order, each job's facts, no job shown whose feature is not available, one reconcile job per account, jobs ticked when done, the one-week backup rule (never, 8 days, 7 days, 0 days), the BAS days left and overdue, and an empty list counting as up to date. `next-step-text.test.ts` words each job. `home.test.tsx` renders all five kinds of job from made-up facts, with their buttons opening the right pages.
- **Both states seen on screen, in the real app:** the sample books ("You are up to date", screenshot 02) and brand-new books ("Getting started", screenshot 30).

## Notes

- **In Demo 2 the To do box is empty**, because none of its jobs can be done yet. This follows the spec ("Jobs whose feature does not exist yet are not shown"). The author should know it before the client sees it: it is the honest state, and it fills in from Demo 4.
