# 094: BAS Worksheet Figures

Spec: [094](../feature-specs/08-demo-6-reports-and-bas/094-bas-figures.md)
Status: Done (on question 3's assumption)
Date: 2026-11-26
Branch: feature/08-demo-6-reports-and-bas

## What was done

- `basFigures`: G1, 1A and 1B added up from `basContributions` of every line with a GST code in the period, and the net to pay or be refunded. Cash basis assumed (question 3); on the accrual basis the same lines are counted until invoices and bills exist (folder 10), and the note says so.

## Verified

- `npm run check` (typecheck both configs, lint, 97 test files, 1,130 tests), `npm run format:check`, `npm run test:layout` (now also every report page, the lines sheet and the Customise panel, at 1100 to 1700) and `npm run test:e2e` (package check, 2 tests; the self-check now also saves and reopens a report and closes the quarter) pass on 2026-11-26.
- Sample books: July to September's GST to pay is $785.16, the BAS payment worked out ahead in `sample-figures.ts`, and 1A less 1B equals it; October to December so far equals Home's GST owing ($3,184.20).

## Notes

- Built in one run of folder 08 at the author's request (2026-11-26). Choices taken where the spec left room are in `progress-tracker.md` (Follow-ups).
