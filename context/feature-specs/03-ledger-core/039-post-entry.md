# 039: Posting Service: Post an Entry

The single service that writes the books. It refuses anything that does not balance or falls in a locked period, and records every write (risk L1).

**Client sees:** nothing. Internal.

## Depends On

- 038

## Implementation

1. `src/services/post-journal.ts`: `postEntry` validates with `validateEntry`, then in one transaction writes the entry, its lines and an audit row.
2. If anything fails, nothing is saved.

## Check When Done

- Tests: a balanced entry posts with one audit row. An unbalanced one is refused with nothing saved. A forced failure halfway leaves no partial rows.
- `npm run check` passes.
