# 084: Manage Accounts on Screen

Adding, renaming and deactivating accounts from the chart of accounts page.

**Client sees:** New account and Edit on the Accounts page.

## Depends On

- 083

## Implementation

1. New account sheet: name, code, type, parent (for sub-accounts), usual GST.
2. Edit: rename, change code, deactivate or reactivate, with a warning when it has posted lines.
3. "Clean up" (W05b, Option 5) is left for a later spec if the client wants it after Demo 5.

## Check When Done

- e2e: add, rename, deactivate. `npm run check` passes.
