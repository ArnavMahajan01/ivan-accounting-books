# 140: guide-backups-and-settings

Spec: [140](../feature-specs/11-demo-9-settings-help-backup/140-guide-settings.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- New Help group **Settings and backups** (`GUIDE_GROUPS`), with three guides:
  - **Back up and restore your books:** turning on (with the safety advice to write the recovery key down and keep it away from the backups), the daily and after-import backup, Back up now, Home's reminder, restoring (checking the date first, and the recovery key for another Mac's backup), and what to do when something goes wrong.
  - **Change your settings:** the cards and the attention line; Business, GST and BAS, with "check with your accountant first" before changing the basis or frequency; Bank accounts, adding one before its first import; Appearance.
  - **Export all your data:** what is written and where, what each file holds, and that an export is not a backup.
- Six images from the built app, sample books, at 1440, halved, each under 220 KB: `recovery-key`, `backups-card`, `restore-sheet`, `settings-page`, `business-sheet`, `export-done`.
- **Updated:**
  - Getting started points to the backup guide.
  - The import guide's "not one of your bank accounts" now says to add it in Settings, Bank accounts.
  - Settings' **Help** button opens Change your settings (spec 135).

## Verified

- `npm run check`: 1,344 tests pass. The guide check validates all three and their images, and every page's guide exists.
- Each step was followed in the built app by the script that took the images: choose folder, turn on, write-down tick and Done, Back up now, Restore from a backup… (the sheet), Change… with Monthly (the warning), Export all data….
- Restore and replace itself was followed in the run for spec 138.

**Not checked:** a read for plain wording by the author. A backup to an actual Google Drive folder.
