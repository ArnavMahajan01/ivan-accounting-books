# 099: Export a Report to PDF

Spec: [099](../feature-specs/08-demo-6-reports-and-bas/099-export-pdf.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- `src/main/report-html.ts` (the print page: business, report, period, figures, check, note; everything escaped; no script) and `src/main/report-exports.ts`: printed at A4 with page numbers by a hidden window that is sandboxed, runs no JavaScript, may load nothing but the page itself, and is destroyed afterwards.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Built app: a 35 KB file starting %PDF-. **Not checked:** the PDF looked at by eye for each report at A4.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
