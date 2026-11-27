# 126: Import Invoices From a File

Bringing issued invoices into the books with a preview, like a bank file (W08a, Option 1).

**Client sees:** "3 new invoices, 1 already in your books".

## Depends On

- 125

## Implementation

1. Migration: `invoice` (id, number, version, contact id, dates, totals, status, source file hash), `invoice_line`.
2. Preview: new, already in, replaced versions. Commit posts each new invoice through the posting service (accounts receivable, sales, GST) in one transaction.
3. A replaced version reverses and reposts, with audit rows. Quotes are ignored.

## Check When Done

- Tests: import twice adds nothing, a replaced version reposts, the trial balance still balances.
