# 091: Balance Sheet Screen

Spec: [091](../feature-specs/08-demo-6-reports-and-bas/091-bs-screen.md)
Status: Done
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- The balance sheet as at a day (a date box, today to start): assets, liabilities, equity with Earnings from earlier years (when there are any) and Current year earnings, and in words "Assets equal liabilities plus equity." or that they do not.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- It balances for every month end of the sample year (test). Built app: the sentence shown.

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
