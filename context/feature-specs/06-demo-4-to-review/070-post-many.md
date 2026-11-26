# 070: Post Many Lines at Once

Tick several lines and post them together, for working through 50 lines fast.

**Client sees:** "Post 12 selected".

## Depends On

- 069

## Implementation

1. Selection with checkboxes and Space, Select all for the filter shown.
2. `postLines(ids)`: each line posted in its own transaction, so one bad line does not block the rest. The result lists any that failed and why.
3. A clear message: "12 posted. 1 needs an account."

## Check When Done

- Test: 12 lines with one missing an account posts 11 and reports 1. `npm run check` passes.
