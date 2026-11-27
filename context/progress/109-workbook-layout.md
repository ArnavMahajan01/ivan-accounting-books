# 109: Workbook Layout

Spec: [109](../feature-specs/09-demo-7-google-sheets/109-workbook-layout.md)
Status: Done
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `src/domain/workbook.ts` (pure): `planWorkbook` takes the app's tabs, the workbook's tabs now, whether the workbook is new, and how many rows each app tab had last time, and returns the exact writes: app tabs to add (each with a developer-metadata marker, key `accounting-books-tab`), Google's blank first tab to remove (new workbooks only), the app's old protections to replace, and for each app tab the range to clear and write. His tabs are listed as kept and never touched.
- An app tab owns columns A to its last column, from row 1 down to the longer of last time and now. His columns to the right and rows below are outside every range. A tab he renamed is found by its marker and keeps his name. A tab he deleted is added again, under a free name if he used its name for his own tab.
- `columnLetters`, `a1Range` (quotes tab names, doubling an apostrophe) and `cellA1`.

## Verified

- `workbook.test.ts`, 9 tests: a new workbook; his extra columns (the range ends at the app's last column); his extra tabs kept; a renamed app tab found by marker; a shorter report clears the old rows only; only the app's protections replaced; a deleted tab added under a free name; amount formats; ranges past Z and quoted names.
- `npm run check` passes.

## Notes

- If a report grows longer than last time, the extra rows below the old app range are written by the app. A note in each app tab's heading rows says which rows are the app's (spec 110).
