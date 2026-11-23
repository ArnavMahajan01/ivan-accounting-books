# 049: Home: Next Steps List

Home's to-do list (wireframe W03, Option 2): one row per job with one button, ticking off as he catches up.

**Client sees:** what needs doing, in plain words.

## Depends On

- 048

## Implementation

1. A small rules list in `src/domain/next-steps.ts` (pure): from counts and dates, which jobs to show and in what order (review lines, reconcile, back up, BAS due, accountant changes).
2. Jobs whose feature does not exist yet are not shown.
3. A brand-new book shows the getting-started list instead.

## Check When Done

- Tests for the rules. Both states seen on screen.
- Impeccable `critique`, P0 and P1 fixed. `npm run check` passes.
