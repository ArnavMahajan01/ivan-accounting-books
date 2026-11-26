# 098: Export a Report to CSV

Spec: [098](../feature-specs/08-demo-6-reports-and-bas/098-export-csv.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Export CSV asks where to save with the Mac's save sheet (main process) and writes the report: amounts as plain numbers (`-1234.50`), dates DD/MM/YYYY, and any text starting with =, +, - or @ kept as text with a leading apostrophe.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Tests: `=HYPERLINK(...)` exports as text; commas and quotes quoted. Built app: the CSV's first lines were read back. **Not checked:** opening it in Numbers by hand.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
