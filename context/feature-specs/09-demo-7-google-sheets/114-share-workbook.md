# 114: Share a Workbook

Sharing a workbook with a named person as viewer, commenter or editor, with the full email and role confirmed first (risk G2).

**Client sees:** the share dialog and "Check before sharing".

## Depends On

- 113

## Implementation

1. Dialog: email, role with plain explanations, then a confirmation step showing the full email and role.
2. Drive permission for that email only. Never link sharing.

## Check When Done

- Manual test with a second test account: it sees the file with exactly that role.
