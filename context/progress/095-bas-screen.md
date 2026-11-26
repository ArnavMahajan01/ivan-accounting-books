# 095: BAS Worksheet Screen

Spec: [095](../feature-specs/08-demo-6-reports-and-bas/095-bas-screen.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- The worksheet for a quarter (This quarter, Last quarter, Choose dates): G1, 1A, 1B with their plain names, each opening its lines, GST to pay (or to be refunded), "Locked" beside the title when the quarter is locked, and the note: basis, and "For you or your accountant to fill in the BAS. The app does not lodge anything with the ATO."

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Built app: $785.16 for July to September.
- Impeccable passes skipped at the author's request; looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
