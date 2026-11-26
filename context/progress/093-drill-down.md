# 093: Lines Behind a Figure

Spec: [093](../feature-specs/08-demo-6-reports-and-bas/093-drill-down.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Every account figure (and every BAS label) is a button that opens a sheet with date, payee, before GST, GST and total, the total, and Open in Transactions. The lines are added up the same way round as the figure (natural, debit or credit), which the test below caught for Owner drawings in the trial balance.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Test: on the sample books, for every money figure of the profit and loss, balance sheet, trial balance and BAS (39 figures), the lines' total equals the figure. Keyboard: the figures are buttons with a name saying what they open.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
