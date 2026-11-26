# 082: "Do This Every Time?" After Posting

After he posts a line, the app offers to make a rule from it, already filled in (W05a, Option 2).

**Client sees:** "Do this every time for BUNNINGS?"

## Depends On

- 081

## Implementation

1. After a post, if no rule matched and the same words were posted the same way at least twice, show the offer with "Not now".
2. Accepting opens the rule editor filled from the line.

## Check When Done

- Tests for when the offer appears. `npm run check` passes.
