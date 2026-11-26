# 102: His Own Columns: Notes and Picked Calculations

Adding his own column to a report: notes he types, or a calculation picked from a list (W06a, "New column…").

**Client sees:** the New column sheet with a preview.

## Depends On

- 101

## Implementation

1. Column kinds: notes (text per row, saved with the layout) or a calculation: difference between two columns, % change, % of income, GST in an amount, flag if over an amount.
2. `src/domain/report-calcs.ts` (pure), using `gst.ts` for GST and integer maths for money.
3. Preview before adding. Never changes the books.

## Check When Done

- Tests for each calculation, including division by zero shown as a blank cell with "n/a" in words. `npm run check` passes.
