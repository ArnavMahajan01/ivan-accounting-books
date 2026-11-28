# 138: Restore From a Backup

Spec: [138](../feature-specs/11-demo-9-settings-help-backup/138-restore.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- **Restore from a backup…** lists the backups in the folder (date and time, and how many transactions), with the wireframe's plain warning: it replaces the books on this Mac; anything entered after that backup will be gone; the current books are kept until the restore has finished and been checked. **Restore and replace** is a destructive button inside a sheet that asks first.
- **Checks first** (`prepareRestore`): the backup is decrypted into a new file in the app's data folder, opened (migrations bring an older backup forward), and must pass SQLite's integrity check and the books check. A wrong key, an altered or damaged file, a sample backup for his own books, or failed checks: the file is removed and nothing changes.
- **Then the swap** (`BooksSession.replaceBooks`): the open books are closed and kept as `books-before-restore.db` until the next restore, and the checked file takes their place. If it does not open, the old books go back.
- **Afterwards:** the restored books record that backup's time as their last backup, every page refreshes, and the card says "Restored. Your books are as they were at that backup, with 96 transactions."
- **Another Mac's backup:** if this Mac's key cannot open it, a Recovery key box appears and the typed key is used.

## Verified

- `backups.test.ts`: identical books after a restore; tampered and wrong-key files refused with nothing written.
- `books-session.test.ts` (2 new): the swap keeps the old books beside it; a broken file puts the old books back.
- `backup-manager.test.ts`: a restore over changed books removes the change; the recovery key path.
- Settings screen tests: the warning before anything happens, the restore call, the message; the recovery key box.
- **In the built app** (the demo's own steps): back up, change the business name to "Changed After Backup Pty Ltd", restore. The name was back to Harbour Lane Joinery Pty Ltd, with the message and "Last backup" shown. Two problems found here were fixed: the message was lost when the pages refreshed, and the card said there was no backup.

**Not checked:** restoring a backup made by an older version of the app (only same-version backups were made); a backup on another Mac.
