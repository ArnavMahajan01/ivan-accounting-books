# 041: Only the Posting Service Writes the Ledger

Spec: [041](../feature-specs/03-ledger-core/041-single-writer.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `tools/single-writer.test.ts`, using `tools/sql-writes.ts`: two searches over `src/` and `tools/` (test files excluded, because they write raw SQL to throwaway databases on purpose). One fails if SQL that inserts, updates, deletes, replaces, alters or drops `journal_entry` or `journal_line` appears in any file but `src/data/journal-writes.ts`. The other fails if any file but `src/services/post-journal.ts` imports `journal-writes`.
- **Where the spec said `post-journal.ts`:** the SQL is in `src/data/journal-writes.ts` instead, since only `data` may talk to SQLite (`code-standards.md`). The second search is what keeps the posting service the only writer.

## Verified

- `npm run check` passes. **The check fails with a throwaway write and passes once it is removed:** I put `INSERT INTO journal_line (...)` in a throwaway `src/services/zz-throwaway.ts`, the test failed with `src/services/zz-throwaway.ts: insert journal_line (only src/data/journal-writes.ts may)`, and it passed again after I deleted the file (`git status` shows no leftover).
- The guard is also tested on synthetic files: other tables, reads, both import path styles, and the allowed files.

## Notes

- `check-invariants` (invariant 3) now points at this test and a corrected search.
