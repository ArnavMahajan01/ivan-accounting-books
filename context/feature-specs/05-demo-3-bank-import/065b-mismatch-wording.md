# 065b: The Closing Balance Warning Says Importing Is Still Allowed

When the closing balance does not match, the sheet now says he can still import, and what the difference means. Added 2026-11-24 after the Impeccable critique of the import sheet (spec 065): the warning did not say whether to go on.

**Client sees:** two more plain sentences in the warning on the import sheet.

## Depends On

- 065

## Implementation

1. In `src/renderer/import/import-text.ts` `balanceMessage`: when the difference is the lines that could not be read, add "You can still import the other lines. The balance will not match until that line is in." When it is not explained, add "You can still import. A line may be missing from this file or from an earlier one."
2. The guide's problem list says the same.

## Scope Limits

- No change to when a difference is found, or to what blocks an import (nothing does).

## Check When Done

- `import-text.test.ts` and the sheet tests say the new sentences. `npm run check` passes.
