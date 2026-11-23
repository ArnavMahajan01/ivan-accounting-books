# 041: Only the Posting Service Writes the Ledger

A guard that fails the checks if anything else writes journal rows.

**Client sees:** nothing. Internal.

## Depends On

- 040

## Implementation

1. A test that searches the source and fails if any file other than `post-journal.ts` and the migrations contains an `INSERT`, `UPDATE` or `DELETE` on `journal_entry` or `journal_line`.

## Check When Done

- The test fails with a throwaway `INSERT INTO journal_line` elsewhere, and passes once removed.
