# 081: Rules That Post by Themselves

Lines matching a rule marked "post by itself" are posted on import without waiting, as he does in QuickBooks today.

**Client sees:** "9 lines were posted by your rules" after an import.

## Depends On

- 080

## Implementation

1. After `commitImport`, lines matching such a rule are posted through `post-line` (same checks, audit rows).
2. The import result and Home say how many, with a link to see them. Each is undoable.

## Rules And Edge Cases

- Never in a locked period. A rule whose account is inactive is skipped and reported.

## Check When Done

- Tests: posted by rule with audit rows, locked period skipped. `npm run check` passes.
