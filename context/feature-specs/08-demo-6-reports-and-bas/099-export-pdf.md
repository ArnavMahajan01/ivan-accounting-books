# 099: Export a Report to PDF

Reports saved as tidy PDFs.

**Client sees:** Export PDF works.

## Depends On

- 098

## Implementation

1. Print templates for each report: business name, period, page numbers, no motion.
2. Printed by a sandboxed, network-blocked window that is destroyed afterwards (the Admin Dashboard's proven pattern).

## Check When Done

- PDFs for each report at A4, checked by eye. `npm run check` passes.
