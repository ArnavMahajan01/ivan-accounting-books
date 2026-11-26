# 092: Trial Balance Screen

Spec: [092](../feature-specs/08-demo-6-reports-and-bas/092-tb-screen.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Debit and Credit columns, the totals, and "Balanced: debits equal credits." **Choice for the author:** the trial balance is as at the period's end, counting every line from the start of the books, so it always balances; the period picker chooses the day.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Totals equal for the sample year ($100,024.13 on 23 November 2026). Built app: balanced.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
