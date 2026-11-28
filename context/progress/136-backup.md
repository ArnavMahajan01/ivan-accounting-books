# 136: Encrypted Backup

Spec: [136](../feature-specs/11-demo-9-settings-help-backup/136-backup.md)
Status: Done (client question 13 built to its assumption; see Notes)
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- **A consistent copy:** `copyDatabaseTo` in `src/data/database.ts` uses SQLite's own backup, which is safe while the books are open.
- **The file** (`src/backup/backup-file.ts`):
  - It starts with a header line in plain text (made at, app and schema version, number of transactions, sample or real), then the books encrypted with AES-256-GCM.
  - The header is authenticated with the books, so neither can be changed without the restore refusing it.
  - The name is "Accounting Books 2026-11-28 0914.abbackup", or "Accounting Books sample …" for the sample books.
- **The key:** 32 random bytes per Mac, kept in `backup-key.bin` encrypted by the Keychain (`safeStorage`, as for the Google sign-in).
  - The **recovery key** (`src/backup/recovery-key.ts`) is the same key as 13 groups of 4 in Crockford base32. Reading it forgives O, I, L, spaces and case.
  - It is shown when backups are turned on, and Done waits for "I have written down the recovery key". Show recovery key brings it back.
- **Old backups** (`src/backup/retention.ts`): each day's newest is kept for a week, then each week's newest for a month. Only files this app names are ever read or removed.
- **Making a backup** (`src/backup/backups.ts`): the plain copy is made in the app's own data folder and removed straight after. A backup made in the same minute as another gets "2" rather than overwriting it.
- **Main** (`src/main/backup-manager.ts`):
  - the folder and the daily choice are kept in `backup-settings.json`;
  - when these books were last backed up is kept in the books (`services/backup-record.ts`);
  - bridge: `backup.status`, `chooseFolder`, `turnOn`, `recoveryKey`, `setDaily`, `now`, `list`, `restore`. Only the folder's name reaches the screens.
- **Settings, Backups card:** On or Off, "To: Backup · Encrypted", "Last backup: 28/11/2026, 15:30", Back up now, Change folder…, Restore from a backup…, Show recovery key. "Backups are off" counts as needing attention.

## Verified

- `backup-pure.test.ts`:
  - the file opens only with its key;
  - an altered body or header is refused;
  - the recovery key goes there and back;
  - the keeping rule.
- `backups.test.ts`:
  - **a backup restores to identical books** (the same trial balance);
  - it is unreadable without the key, and the books' text is not in the file;
  - a tampered file is refused with nothing written;
  - sample is never restored over his own books;
  - a made-up name is refused;
  - same-minute names;
  - a missing folder.
- `backup-manager.test.ts` (5): turn on, back up and status; restore; recovery key; daily; no Keychain.
- Settings screen tests (5).
- In the built app (sample books, a throwaway folder): chose the folder, turned on (the recovery key sheet, Done waiting for the tick), Back up now ("Backed up."), one file in the folder. The Keychain did not prompt in the development run.

## Notes

- **Client question 13** assumed his Google Drive plus a local folder. Built as one folder he chooses. Choosing the folder that Google Drive for desktop syncs puts the encrypted copy in his Drive with no upload code and no new Google permission. Recorded in `client-questions.md` to ask him.

**Not checked:** a backup to a real external drive or a synced Google Drive folder; the packaged app's Keychain (signed build, folder 12).
