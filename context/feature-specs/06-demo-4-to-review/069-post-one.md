# 069: Post One Line With an Account and GST

Posting a bank line makes a balanced journal entry through the posting service, with GST worked out from the code.

**Client sees:** a line leaves To review and appears in Transactions.

## Depends On

- 068

## Implementation

1. `src/domain/line-to-entry.ts` (pure): bank line plus account plus tax code gives the entry: bank account line, net line, GST line, using `splitInclusive`.
2. `src/services/post-line.ts`: builds the entry, posts it with `postEntry`, sets the line to `posted` and links it, in one transaction.
3. Typing in the account box searches accounts by name or code. Enter posts.
4. The row leaves with a short motion (off under reduced motion).

## Rules And Edge Cases

- Money in and money out, GST-free and BAS-excluded codes, a refund (money in to an expense account).

## Check When Done

- Tests: each case gives a balanced entry with the right GST. Posting the same line twice is refused.
- e2e: post a line, see it in Transactions. `npm run check` passes.
