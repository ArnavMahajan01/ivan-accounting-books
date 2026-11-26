# 103: guide-reports-and-bas

Spec: [103](../feature-specs/08-demo-6-reports-and-bas/103-guide-reports.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- Four guides in a new Help group **Reports and BAS**: Read your profit and loss, Check the BAS worksheet, Close and lock a quarter, Make your own report, with four sample-data images from the built app at 1440.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- The guides validate and every image exists; the steps were followed in the built app by the driving script.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
