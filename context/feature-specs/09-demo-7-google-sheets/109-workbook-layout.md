# 109: Workbook Layout

The pure rules for which tabs and ranges belong to the app and which belong to him, so publishing again never touches his work.

**Client sees:** nothing yet.

## Depends On

- 108

## Implementation

1. `src/domain/workbook.ts` (pure): a published workbook has app tabs (named, with a marker), his tabs, and a Ready formulas tab. App tabs have fixed ranges. Everything else is his.
2. Given the app's new report data and the workbook's current tab list, returns the exact writes needed, touching app ranges only.

## Check When Done

- Tests: his extra columns to the right, his extra tabs, a renamed app tab (detected by marker, not name).
