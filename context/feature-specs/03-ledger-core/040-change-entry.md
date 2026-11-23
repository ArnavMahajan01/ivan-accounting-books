# 040: Posting Service: Change and Remove

How a posted entry is corrected, with its full history kept.

**Client sees:** nothing yet. Used by To review undo and Transactions edits.

## Depends On

- 039

## Decide First

- **How a posted entry is corrected.** Recommendation: changed or removed through the posting service, with the audit log keeping the full before and after, unless it is on or before the lock date. The alternative: never changed, every correction a reversing entry. The author decides. The answer goes into `architecture-context.md` ("Data Model").

## Implementation

1. `changeEntry` and `removeEntry` (as decided), each validating, writing in one transaction, with one audit row holding before and after.
2. Refused on or before the lock date.

## Check When Done

- Tests: each change adds exactly one audit row with the right before and after. A change on the lock date is refused.
- The decision is recorded. `npm run check` passes.
