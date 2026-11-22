# 005: Money in Integer Cents

Adds the only way money is read, added and shown: integer cents with a branded type. This is where an accounting app most often goes wrong, so it is tested hardest.

**Client sees:** nothing. Internal.

## Depends On

- 004

## Implementation

1. `src/shared/money.ts`: a branded `Cents` type.
2. `parseCents(text)` reads bank-style text straight into integer cents without a float. Accepts a leading minus, a trailing minus, brackets for negatives, thousands commas, a dollar sign, and zero to two decimal places. Anything else returns an error.
3. `formatCents(cents)` formats in `en-AU` as AUD, with a minus sign for negatives (never colour alone).
4. `addCents`, `sumCents`, `negateCents`, each checking the result stays a safe integer.
5. A lint rule banning `parseFloat` and `toFixed` in `src/domain`, `src/import` and `src/services` (risk L2).

## Rules And Edge Cases

- `"12.345"`, `"1.2.3"`, `""`, `"abc"` and `"$"` are errors, never zero.
- Very large values (99,999,999,999 cents) and `-0` behave.

## Check When Done

- Tests: `parseCents("1,234.50")` is 123450, `"(45.00)"` is -4500, `"12.3"` is 1230, `"45.00-"` is -4500, `"12.345"` is an error.
- `formatCents(-123450)` is `-$1,234.50`.
- No `parseFloat`, `Number(` on amounts or `toFixed` in `money.ts`. The lint rule fires on a throwaway file.
- `npm run check` passes.
