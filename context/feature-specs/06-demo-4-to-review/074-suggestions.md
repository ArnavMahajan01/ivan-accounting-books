# 074: Suggestions From Past Lines

Each waiting line gets a suggested account from how he posted similar lines before, with the reason in small words.

**Client sees:** "best guess" and "same as last time" under the account.

## Depends On

- 073

## Implementation

1. `src/domain/suggest.ts` (pure): from the line's words and his past postings, the most likely account, payee and GST code, or none.
2. Shown under the account box. Never posted without him (that is what rules are for, folder 07).

## Check When Done

- Tests with invented history. A line with no history gets no suggestion. `npm run check` passes.
