# 072: Split a Line Across Accounts

One bank line shared across several accounts, each with its own GST code, always adding up to the line.

**Client sees:** the Split sheet with "Left to split $0.00 ✓".

## Depends On

- 071

## Implementation

1. A Split sheet (button and S key): rows of account, GST code, amount. Add line. "Left to split" updates as he types.
2. Save is allowed only at $0.00 left. The entry has one line per split, each with its GST.

## Check When Done

- Tests: a 2-way and a 4-way split balance, with GST right on each part. Rounding never leaves a cent over.
- Impeccable `critique` of the sheet. `npm run check` passes.
