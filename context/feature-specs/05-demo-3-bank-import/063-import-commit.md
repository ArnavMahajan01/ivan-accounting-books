# 063: Import Commit Service

Saves a previewed import in one transaction, so a crash can never leave half a file in the books.

**Client sees:** the lines arrive in To review.

## Depends On

- 062

## Implementation

1. `commitImport(previewId)`: re-checks duplicates, then writes the batch and new lines with status `to_review`, in one transaction.
2. Bridge function `bank.commitImport`. Counts are logged, never descriptions or amounts.

## Check When Done

- Tests: commit twice gives no second copy. A forced failure writes nothing. `npm run check` passes.
