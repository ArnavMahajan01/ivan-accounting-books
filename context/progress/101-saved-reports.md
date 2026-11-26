# 101: My Reports: Saved Layouts

Spec: [101](../feature-specs/08-demo-6-reports-and-bas/101-saved-reports.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Migration `0012-report-layouts.sql`: `report_layout` (name unique ignoring capitals, the request as JSON, read back through Zod). Save as my report (or Save, for one of his), listed under My reports with Rename and Delete (which asks first); open, export like any report. The figures are never stored.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Service test: save, list, reopen with the same request, a name in use refused, rename, delete. e2e: the self-check saves a report with a column and reopens it with the same columns.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
