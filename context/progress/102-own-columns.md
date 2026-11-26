# 102: His Own Columns: Notes and Picked Calculations

Spec: [102](../feature-specs/08-demo-6-reports-and-bas/102-own-columns.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- New column…: his notes (typed into each row of the report, saved with his report) or a calculation: difference, % change, % of income, GST inside an amount (the one GST helper), flag if over an amount; a preview of the report with it before Add column. Integer maths; a % of nothing shows "n/a".

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Tests for each calculation, including a % change from nothing as n/a. Built app: the preview and the added column.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
