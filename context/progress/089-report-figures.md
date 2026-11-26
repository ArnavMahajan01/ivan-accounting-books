# 089: Report Figures by Account and Period

Spec: [089](../feature-specs/08-demo-6-reports-and-bas/089-report-figures.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- One report format for every report (`src/shared/reports.ts`): a `ReportRequest` (report, period, as-at day, columns, rows, his own columns) and a `ReportView` (columns, rows of headings, accounts and totals; every money cell knows the lines behind it).
- Pure: `src/domain/report-periods.ts` (this/last quarter to date or whole, this/last financial year, custom; the period before, the same period last year, month by month), `src/domain/report-build.ts` (profit and loss, balance sheet with current year and earlier earnings, trial balance, BAS worksheet; amounts the natural way round), `src/domain/report-calcs.ts`, `src/domain/bas.ts`, `src/domain/csv.ts`.
- `src/services/reports.ts` builds any report from account totals for each column's period (`sumLinesByAccount`).

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Sample books: profit for the year is $42,453.50; the balance sheet balances at every month end and its current year earnings equal the profit; trial balance totals $100,024.13 both sides (all from `sample-figures.ts`).

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
