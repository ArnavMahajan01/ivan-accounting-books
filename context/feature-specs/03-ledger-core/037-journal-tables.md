# 037: Journal and Audit Tables

The tables that hold the books: journal entries, their lines, and the audit log that records every change.

**Client sees:** nothing. Internal.

## Depends On

- 036

## Implementation

1. Migration: `journal_entry` (id, date, memo, source kind, source id, timestamps), `journal_line` (id, entry id, account id, amount in cents, positive debit and negative credit, tax code id, GST cents, payee or contact id nullable, memo), `audit_log` (id, timestamp, change kind, table, row id, before JSON, after JSON).
2. Indexes for date and account. `audit_log` has no update or delete path in code.

## Check When Done

- The migration applies to a test database. `npm run check` passes.
