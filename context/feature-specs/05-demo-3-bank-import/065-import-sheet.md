# 065: Import Preview Sheet

The preview as a sheet over the Bank page, written in plain sentences with the table one click away (wireframe W04, Option 5).

**Client sees:** what will happen before anything is saved.

## Depends On

- 064

## Implementation

1. Sentences: which account and dates, how many new lines go to To review, how many are already in the books, which lines could not be read and why.
2. The closing balance check, pass or difference in words.
3. "See all lines" opens the table with filters (new, skipped, could not read).
4. Import (main action) and Cancel. After import: "24 lines added to To review" with a button there.

## Check When Done

- The three states (clean, duplicates, problem) seen with fixtures.
- e2e test: import a fixture, see the count on the To review badge. Impeccable `critique` and `audit`.
