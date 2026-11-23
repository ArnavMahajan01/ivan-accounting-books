# 037: Journal and Audit Tables

Spec: [037](../feature-specs/03-ledger-core/037-journal-tables.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- Migration `0006-journal.sql`: `journal_entry` (id, date, memo, source kind, source id, timestamps) and `journal_line` (id, entry, position, account, amount in cents, tax code, GST in cents, payee, memo), with indexes on the entry date and the line's account. The database refuses a zero line, GST with the opposite sign to its amount, an unknown account, entry or tax code, the same position twice in one entry, a bad date and an unknown source. It cannot check that an entry sums to zero, so the posting service does.
- `ENTRY_SOURCE_KINDS` in `kinds.ts` (manual, bank line, invoice, opening balance, accountant change).
- **The audit log table already existed** (created in spec 033's migration `0004`). 037's migration adds only the journal tables.
- `tools/sql-writes.ts` (finds SQL that writes a named table in source text) and `tools/audit-append-only.test.ts`: the audit log has one insert (in `src/data/audit-repository.ts`) and nothing else updates, deletes, replaces, alters or drops it. This is the "no update or delete path in code" check.

## Verified

- `npm run check` passes (461 tests). `src/data/journal-tables.test.ts` applies the real migrations and tests each rule above with raw SQL. `tools/sql-writes.test.ts` tests the finder (including multi-line and quoted names, and that reads and similar table names are left alone). `tools/audit-append-only.test.ts` passes on the real source and fails on a throwaway `DELETE FROM audit_log` and `UPDATE audit_log`.

## Notes

- `ENTRY_SOURCE_KINDS` is a CHECK list in the table. A later spec that adds a source needs a migration that rebuilds the table.
