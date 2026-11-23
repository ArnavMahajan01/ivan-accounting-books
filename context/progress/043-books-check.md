# 043: Books Check on Launch

Spec: [043](../feature-specs/03-ledger-core/043-books-check.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/services/check-books.ts`: `checkBooks` runs the file's integrity check, adds the account totals over every date (they must come to zero) and counts entries whose own lines do not sum to zero, and returns `{ problems, entries, lines }`. Problems are `integrity-failed` and `out-of-balance`, and `not-open` for books that did not open. Data it cannot read is reported as `integrity-failed`, never thrown. It changes nothing.
- The bridge function **`books.getHealth`** (in `src/shared/bridge-contract.ts`, with its handler in `src/main/handlers.ts`) returns it. The preload exposes it automatically.
- On every launch the main process runs the check and logs `books.checked` with counts, or `books.check-failed` with counts and the first problem code (nothing from the books is logged). `integrityProblems` is exported from `src/data/database.ts`.

## Verified

- `npm run check` passes (524 tests). `src/services/check-books.test.ts` finds nothing wrong in new books or posted ones, and reports a line changed straight in the database, a line deleted, two broken entries that cancel in the trial balance (the per-entry check catches them), a row that breaks its table's rules (through the integrity check), and data it cannot read. `src/main/bridge.test.ts` tests `books.getHealth` for sound books, books that did not open, and books that do not balance.
- `npm run test:e2e` passes, and the end-to-end test now asserts that the packaged app logged `books.checked` and no `books.check-failed`.

## Notes

- **Where it differs from the spec:** it checks every date, not "from the first entry to today", and checks each entry as well as the whole. Both only find more.
- Home's warning is built in Demo 2 (spec 048), as the spec says.
