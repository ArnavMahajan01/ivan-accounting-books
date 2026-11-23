# 035: GST Maths

Spec: [035](../feature-specs/03-ledger-core/035-gst-maths.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/domain/gst.ts`: `GST_RATE_BP` (1000, the one constant for the rate), `gstFromInclusive`, `gstOnExclusive` and `splitInclusive`, in integer cents with a rate in basis points. Rounding is to the nearest cent with exactly half rounded away from zero, written in the file's header. The GST in an inclusive amount is one eleventh (`cents x rate / (10000 + rate)`), never 10% of it. The arithmetic checks that nothing exceeds exact integers and throws a `RangeError` if it would, and the quotient is worked out with `%` so no float division is involved.
- `tools/gst-only-in-gst-ts.test.ts`: a search of `src/` for hand-written GST (`/ 11`, `/ 1.1`, `* 0.1`) outside `gst.ts` and its own test.

## Verified

- `npm run check` passes (424 tests). `src/domain/gst.test.ts`: 1100 gives 100, 1999 gives 182, 1005 gives 91, 1 cent and 5 cents give 0, 6 cents gives 1, 99,999,999 gives 9,090,909, negatives mirror, a zero rate gives 0, 10.5 cents rounds to 11 and -10.5 to -11. For every amount from -3,000 to 3,000 cents at four rates, net plus GST equals the original, and the GST has the same sign and is no bigger than the amount. Bad rates and amounts too large to be exact throw.
- The search test passes on the real source and is shown to catch `total / 11;`, `total*0.1` and `t / 1.1`, while leaving alone dates such as `21/11/2026`, `/ 110` and `* 0.11`.

## Notes

- Source for one eleventh and rounding: ATO, recorded in the `au-bookkeeping-rules` skill. Which invoice-rounding method applies is client question 27, not built here.
