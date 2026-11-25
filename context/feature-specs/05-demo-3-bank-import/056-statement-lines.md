# 056: Statement Lines and Import Batches

The tables that hold imported bank lines and the files they came from.

**Client sees:** nothing yet.

## Depends On

- 055

## Implementation

1. Migration: `import_batch` (id, bank account id, file name, file hash, period from and to, counts, closing balance, imported at), `statement_line` (id, bank account id, batch id, date, description, amount cents, balance cents nullable, bank id or computed key, status `to_review`, `posted`, `excluded`).
2. A unique key per account on the bank's transaction id, or on a computed key (date, amount, description, running balance, position) when there is none (risk L3).

## Check When Done

- Inserting the same line twice is refused by the unique key. `npm run check` passes.
