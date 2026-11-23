# 038: Entry Validation

Spec: [038](../feature-specs/03-ledger-core/038-entry-validation.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/domain/journal.ts`: the entry types (`EntryInput`, `JournalEntry`, `JournalLine`) and `validateEntry(entry, context)`, which returns every problem at once: `too-few-lines`, `lines-do-not-balance` (with the difference), `zero-line`, `gst-sign`, `unknown-account`, `inactive-account` (each with its line number) and `locked-period`. `isLocked(date, lockDate)` is true on and before the lock date. The context (the accounts that exist and the lock date) is passed in, so it stays pure.
- The GST convention is in the file's header, with two worked entries: a taxable line's amount is net of GST, the GST is on the line with the same sign, and a separate line to the GST account carries the total of those amounts.

## Verified

- `npm run check` passes (472 tests). `src/domain/journal.test.ts` has a test for each problem and for valid entries (a sale with GST, a purchase with GST, a transfer), the lock date boundary (the lock date itself refused, the day after allowed, no lock allows any date), and an entry with every problem at once.

## Notes

- `gst-sign` is one extra problem beyond the spec's list. Without it, the database would refuse the line with a thrown error instead of a returned problem.
- **Not checked by `validateEntry`:** that the GST account's lines equal the total of the lines' GST amounts. The spec asks for the convention in a doc comment, and the check would need to know which account is the GST account. The spec that builds entries from bank lines (folder 06) must build them this way, and a check could be added then.
