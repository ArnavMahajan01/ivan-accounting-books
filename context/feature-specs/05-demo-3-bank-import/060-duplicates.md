# 060: Duplicate and Overlap Detection

Works out which lines in a file are already in the books, so importing the same or an overlapping file adds nothing twice (risk L3).

**Client sees:** "6 lines are already in your books" in the preview.

## Depends On

- 059 (or 058 if CSV is waiting)

## Implementation

1. `src/domain/duplicates.ts` (pure): given parsed lines and the existing keys for that account, mark each line new or duplicate.
2. Two genuinely identical transactions on the same day in one file are both kept (position in the file is part of the computed key).

## Check When Done

- Tests: the same file twice gives zero new lines. An overlapping month gives only the new days. Two identical coffees on one day both stay.
