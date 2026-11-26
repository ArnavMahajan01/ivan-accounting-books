# 100: Customise a Report: Columns and Rows

Spec: [100](../feature-specs/08-demo-6-reports-and-bas/100-customise-report.md)
Status: Done (profit and loss only)
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- The Customise panel beside the profit and loss (over it below 1500 wide): Start from (Compare quarters, Month by month, For the accountant), Columns (Last period, Same period last year, % of income, Month by month), Rows (accounts with no amounts, small expenses as "Other", codes). Every tick asks the books again straight away.
- **Choices for the author:** customising is offered on the profit and loss only; "small" means under 2% of the first column's income.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Tests for each column's figures (comparison columns, month by month adding up to the year, % of income). Built app: the columns appeared on ticking.
- Impeccable passes skipped at the author's request; looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
