# 035: GST Maths

The one place GST is worked out, so every amount, report and BAS figure uses the same tested rule.

**Client sees:** nothing. Internal.

## Depends On

- 034

## Implementation

1. `src/domain/gst.ts`: `gstFromInclusive(cents, rate)` and `gstOnExclusive(cents, rate)`, integer cents, round half away from zero (written in the doc comment).
2. `splitInclusive(cents, rate)` returns net and GST that always add back exactly.

## Rules And Edge Cases

- 1100 cents gives GST 100. 1 cent, 5 cents, 99,999,999 cents, negatives, and a zero rate are tested.
- GST in an inclusive amount is one eleventh, never 10% of it.

## Check When Done

- For every test amount, net plus GST equals the original.
- No `/ 11` or `* 0.1` outside `gst.ts` (a search test). `npm run check` passes.
