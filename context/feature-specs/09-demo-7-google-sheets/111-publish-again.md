# 111: Publish Again Into the Same Workbook

Publishing again updates the same workbook, keeping the link, the sharing, and his own tabs and columns.

**Client sees:** "Publish again" with "updated in place".

## Depends On

- 110

## Implementation

1. Uses `workbook-layout` to write only app ranges. A deleted workbook is noticed and offered "Publish as new".
2. Shows what changed since last time (counts).

## Check When Done

- Manual test: add a tab and a column in the sheet, publish again, both are still there.
