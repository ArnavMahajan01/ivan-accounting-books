# 038: Entry Validation

The pure check every journal entry must pass before it is saved.

**Client sees:** nothing. Internal.

## Depends On

- 037

## Implementation

1. `src/domain/journal.ts`: `validateEntry(entry, context)` returns the problems: lines not summing to zero, fewer than two lines, a zero line, an inactive account, a date on or before the lock date.
2. GST convention (doc comment and skill 018): a taxable line's amount is net, its GST is recorded on the line, and a separate line to the GST account equals the sum of those GST amounts with the right sign.

## Check When Done

- A test for each problem, and for a valid entry. `npm run check` passes.
