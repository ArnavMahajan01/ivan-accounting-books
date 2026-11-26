# 097: Quarter Close Checklist and Lock

Spec: [097](../feature-specs/08-demo-6-reports-and-bas/097-quarter-close.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- `src/renderer/reports/QuarterClose.tsx`: Close <the last BAS period>: every bank line reviewed, each bank account reconciled to the period's end, the BAS figures with a link to the worksheet, then Lock…, which says what will be locked and needs "The BAS for this quarter is done" ticked. Uses the business's BAS frequency, so a monthly business closes a month.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- e2e: the packaged app's self-check closes and locks the sample quarter. Screen test: Lock stays greyed until the box is ticked.
- Impeccable passes skipped at the author's request; looked at in screenshots at 1100 and 1440 instead.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
