# 138: Restore From a Backup

Replacing the books with a backup, safely (risk U2).

**Client sees:** the restore warning, then his books as of that backup.

## Depends On

- 137

## Implementation

1. Pick a backup, see its date and contents summary, confirm a plain warning.
2. Validate and decrypt into a temporary file, run the integrity and books checks, then swap. The current books are kept until the new ones pass.

## Check When Done

- Tests: a tampered backup is refused and nothing changes. A good one restores every entry.
