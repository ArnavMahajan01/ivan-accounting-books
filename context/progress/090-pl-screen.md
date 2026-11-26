# 090: Profit and Loss Screen

Spec: [090](../feature-specs/08-demo-6-reports-and-bas/090-pl-screen.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Reports in the sidebar opens a list (My reports, then the four reports, and Close the last quarter). `src/renderer/reports/ReportScreen.tsx` shows any report: back to Reports, the period (This quarter, Last quarter, This financial year, Last financial year, Choose dates), the table, its check and note.
- Export CSV and Export PDF sit beside the period (the toolbar keeps Customise and Save as my report, so it fits at 1100). Publish to Google Sheets is greyed with "Comes with Google Sheets, in a later version."

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Built app: net profit shown, period changed, every export working.
- Impeccable passes skipped at the author's request; looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
