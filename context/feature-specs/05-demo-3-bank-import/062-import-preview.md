# 062: Import Preview Service

Reads a dropped file and returns everything the preview shows, writing nothing.

**Client sees:** nothing directly.

## Depends On

- 061

## Implementation

1. `src/services/import-file.ts` `previewImport(path)`: read the file in the main process, pick the reader, check the account's last four digits against the file, run duplicates and the balance check.
2. Returns: account, period, counts (new, duplicate, rejected with reasons), the balance result, and the lines.
3. Bridge function `bank.previewImport`. The renderer never reads the file.

## Check When Done

- Tests for every fixture, including the wrong-account file ("This file is for a different account"). Nothing is written.
