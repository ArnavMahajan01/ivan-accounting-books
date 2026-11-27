# 124: Merge Duplicate Contacts

Spots likely duplicates and merges them, keeping every link (W08b, Option 5).

**Client sees:** "Bunnings and Bunnings Warehouse look the same. Merge?"

## Depends On

- 123

## Implementation

1. `src/domain/similar-names.ts` (pure): likely pairs from names and shared description words.
2. Merge moves all links to one contact, with an audit row. Keep both hides the pair.

## Check When Done

- Tests for detection and merge. `npm run check` passes.
