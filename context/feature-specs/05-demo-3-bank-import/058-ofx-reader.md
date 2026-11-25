# 058: OFX Reader

Reads a Westpac OFX file into validated statement lines, or an error naming the problem, without throwing (risk U1).

**Client sees:** nothing directly.

## Depends On

- 057

## Implementation

1. `src/import/ofx.ts` (pure): parse the header, account id, date range, transactions (date `YYYYMMDD`, amount, name and memo, FITID) and the ledger balance.
2. Amounts with `parseCents`, dates with `parseCalendarDate`.
3. Returns lines plus per-line errors naming the line. A size limit refuses huge files early.
4. `src/import/registry.ts`: picks the reader by content, not by file extension.

## Check When Done

- Tests with every fixture. The bad-date file gives one line error and the rest parse.
- `npm run check` passes.
