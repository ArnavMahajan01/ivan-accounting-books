# 005: Money in Integer Cents

Spec: [005](../feature-specs/00-foundations/005-money.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

`src/shared/money.ts`:

- `Cents`: a `number` branded with a unique symbol, so a plain number cannot be passed as money by mistake.
- `parseCents(text)` returns `Result<Cents, MoneyParseError>`. The error has a `code` (`not-an-amount`, `too-many-decimals` or `too-large`) and the original `text`. It trims spaces, matches one strict pattern, then builds the cents one digit at a time with integer maths, checking each step stays a safe integer. No float, `Number()` or `parseFloat` is used.
  - Accepted: a leading minus, brackets, or a trailing minus (exactly one of them); a dollar sign after the minus or the opening bracket; whole dollars with no commas or with correct thousands commas; and an optional point with 1 or 2 digits.
- `formatCents(cents)` uses `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })` and gives it an exact decimal string such as `"-1234.50"`, not `cents / 100`, so showing an amount never goes through a float either.
- `addCents`, `sumCents` (an empty list is zero) and `negateCents`.
- Also added, because the spec's helpers and tests need them: `asCents(n)` to turn a checked whole number into `Cents` (for database rows and constants), and `ZERO_CENTS`.
- Lint (`eslint.config.js`): `parseFloat`, `Number.parseFloat` and any `.toFixed` are errors in `src/domain`, `src/import`, `src/services` and `src/shared/money.ts` (risk L2).

Choices where the spec left room. Each is covered by a test:

- **Overflow throws a `RangeError`.** `addCents`, `sumCents`, `negateCents` and `asCents` throw instead of returning a `Result`. A total beyond about $90 trillion can only come from a bug, and `parseCents` already rejects any single amount too large to hold safely (`too-large`).
- **Rejected forms:** `"12."` and `".50"` (no digit after, or before, the point), `"+12.00"`, `"$-12.00"`, `"12 000"`, misplaced commas (`"1,23"`, `"1,2345.00"`), two negative markers (`"-(45.00)"`, `"-45.00-"`), one bracket only, `"1e3"`, `"NaN"`, `"Infinity"` and non-ASCII digits. If a real Westpac file needs one of these, a later spec adds it with a test.
- **No `-0`:** `-0` never comes out of any helper. `asCents(-0)`, `parseCents("-0.00")` and `negateCents(0)` all give `0`.

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest "Test Files 4 passed (4), Tests 73 passed (73)". `money.test.ts` has 63 of them.
- The spec's cases, each a test:
  - `"1,234.50"` is 123450, `"(45.00)"` is -4500, `"12.3"` is 1230, `"45.00-"` is -4500.
  - `"12.345"` is `too-many-decimals`. `"1.2.3"`, `""`, `"abc"` and `"$"` are `not-an-amount`, never zero.
  - `formatCents(-123450)` is `-$1,234.50`.
  - 99,999,999,999 cents parses from `"999,999,999.99"`, formats as `$999,999,999.99`, and adds and negates exactly.
  - `Number.MAX_SAFE_INTEGER` cents is the largest accepted amount. One cent more is `too-large`.
  - `-0`: see above.
- Formatting round-trips through `parseCents` for seven values from -123450 to 99,999,999,999.
- `grep -n -E "parseFloat|toFixed|Number\(" src/shared/money.ts` found nothing.
- The lint rule fires. Throwaway `tmp-float.ts` files with `parseFloat("12.30")`, `Number.parseFloat("12.30")` and `(12.3).toFixed(2)`, deleted afterwards:
  - `src/domain`, `src/import`, `src/services`: 3 errors each, for example `Unexpected use of 'parseFloat'. Floats drift by cents. Use parseCents and formatCents from @shared/money` and `'toFixed' is restricted from being used...`.
  - `src/main`: no error, since the spec lists only the three folders.
  - `src/domain/tmp-both.ts` (`fetch` and `parseFloat`): both fire, so the money ban and 003's purity ban work together.

Not checked: formatting inside Electron. Electron's Intl data could differ from Node 26's. Spec 008 should run `formatCents(-123450)` once in the main process.

## Notes

- A fix during the spec: `typescript-eslint` strict mode rejects a unary minus on a branded number (`no-unsafe-unary-minus`), so `negateCents` uses `0 - cents`, which also never makes `-0`.
- In ESLint flat config a later block replaces a rule's options, so the purity block for `domain` and `import` repeats the `parseFloat` entry in `no-restricted-globals`. The comment in `eslint.config.js` says so.
- GST rounding is not here. It belongs to the GST helpers in folder 03, as `code-standards.md` says.
