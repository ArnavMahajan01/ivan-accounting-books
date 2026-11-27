# 110: Publish a Report to a New Workbook

The first publish: a new workbook in an "Accounting Books" folder in his Drive, values written as RAW (risk G3).

**Client sees:** "Published. Open in Google Sheets".

## Depends On

- 109

## Implementation

1. Migration: `sheet_link` (id, Google file id, report or layout id, period, last published at, last published hash).
2. Create the folder once, then the workbook, write the app tab with RAW values, protect app ranges from editing except allowed columns (client question 7).
3. "Open in Google Sheets" opens it in the default browser.

## Check When Done

- e2e against the test account (manual run, not in CI): publish, open, see the figures. A description starting with `=` appears as text.
