# 085: Reconcile Service

Matches the books to a statement's closing balance for a date, and remembers what was reconciled.

**Client sees:** nothing yet.

## Depends On

- 084

## Implementation

1. Migration: `reconciliation` (id, bank account id, statement date, statement balance, books balance, difference, done at).
2. `src/services/reconcile.ts`: books balance at the date from posted lines, the difference, and the lines not yet posted or cleared. Done only at zero difference.
3. Reconciled lines are marked, and changing one later warns.

## Check When Done

- Tests: balanced, a difference from a waiting line, a difference from a missing line. `npm run check` passes.
