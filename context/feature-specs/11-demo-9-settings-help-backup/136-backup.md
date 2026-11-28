# 136: Encrypted Backup

An encrypted copy of the books in a place he chooses (risk D2).

**Client sees:** "Back up now" and "Last backup: today 09:14".

## Depends On

- 135

## Decide First

- Client question 13 (where backups go).

## Implementation

1. A consistent copy of the books file (SQLite backup API), encrypted with a key kept in the Keychain plus a recovery phrase he writes down.
2. Saved to the chosen folder or drive with date and version. Old backups kept by a simple rule (daily for a week, weekly for a month).

## Check When Done

- Test: a backup restores to identical books. The file is unreadable without the key.
