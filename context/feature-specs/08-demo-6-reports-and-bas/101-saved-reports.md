# 101: My Reports: Saved Layouts

His customised reports saved with a name and listed above the standard ones (W06a, Option 4).

**Client sees:** "Quarterly P&L for accountant" under My reports.

## Depends On

- 100

## Implementation

1. Migration: `report_layout` (id, name, base report, settings JSON).
2. Save, rename, delete (with confirmation), open, export and publish like any report.

## Check When Done

- e2e: save, reopen with the same columns. `npm run check` passes.
