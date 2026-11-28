# 137: Backup Schedule and Reminders

Backups happen by themselves, and Home says when they have not.

**Client sees:** "No backup for 9 days" only when it is true.

## Depends On

- 136

## Implementation

1. A daily backup while the app is open, and after each import.
2. Home's warnings and next steps show an overdue backup.

## Check When Done

- Tests with a fixed clock. `npm run check` passes.
