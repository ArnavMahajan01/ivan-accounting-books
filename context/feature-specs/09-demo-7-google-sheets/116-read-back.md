# 116: Read Back the Accountant's Changes

Notices edits to the allowed columns in published sheets, and keeps them as proposals (invariant: nothing from Sheets changes the books until accepted).

**Client sees:** the Accountant changes badge count.

## Depends On

- 115

## Decide First

- Client question 7 (which columns). Assumption: account, GST code and note.

## Implementation

1. Migration: `accountant_change` (id, sheet link, row key, field, old value, new value, by, at, status).
2. Every 2 minutes while the app is open, compare allowed columns with what was published. New differences become proposals.
3. Values are validated (an unknown account name becomes "not recognised").

## Check When Done

- Manual test: edit a cell as the accountant, see it within 2 minutes. Nothing in the books changed.
