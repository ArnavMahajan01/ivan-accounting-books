# 137: Backup Schedule and Reminders

Spec: [137](../feature-specs/11-demo-9-settings-help-backup/137-backup-schedule.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- **The daily backup:** while the app is open, a minute after it starts and then every hour, a backup is made if backups are on and the last one is a day old (`runIfDue`).
- **After an import:** each bank import is followed by a backup when backups are on (`afterImport`, from the import hook in `src/main/index.ts`). Two never run at once.
- **Home:** the "Back up your books" job (built at spec 049 and switched off until now) is on. It is to do when there has never been a backup, or the last is more than 7 days old ("Your last backup was 9 days ago"), and ticked off otherwise. The days come from the books' own record.
- **Settings:** "The last backup was N days ago" counts as needing attention after a week, as on Home.

## Verified

- `backup-manager.test.ts` with fixed clocks: a second check the same day makes no backup; a day later it does, and the time is recorded.
- `views.test.ts`: the job is to do on books never backed up, done right after a backup, and to do again 9 days later. The two Home tests that listed the jobs exactly now include it. This is an intended change, not a weakened test: the sample Home is no longer "up to date" until a backup is made.
- Settings test: a backup over a week old needs attention.

**Not checked:** a backup that runs by itself after an hour in a real session (the timer was not waited for). The import hook was not driven in the built app.
