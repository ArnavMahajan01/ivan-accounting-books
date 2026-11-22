# How The Books Are Stored On The Mac

**Status:** Decided by the author on 2026-11-22: one SQLite file. Encryption at rest is still decided before folder 12

This decides the format of the client's books on his Mac, and how the file is protected if the Mac is lost. The author asked on 2026-11-21 for no database, with everything kept inside the user's application. All options below keep everything inside the app on his Mac, with no server. The question is only the file format.

## The Options

- **One SQLite file** in the app data folder. A database engine inside the app, with no server. It is one file on disk.
- **Plain JSON or CSV files** in the app data folder, read and written by the app.
- **SQLite with encryption** (a SQLCipher-compatible build), so the file is unreadable without a key held in the Keychain.
- **SQLite without its own encryption, relying on FileVault**, which encrypts the whole disk.

## Comparison

| Topic | Plain JSON or CSV files | SQLite file | SQLite with encryption |
|---|---|---|---|
| A crash during a save | Can leave half a file, and broken books | All or nothing | All or nothing |
| Two related changes (an entry and its audit row) | Can disagree | Saved together | Saved together |
| Unique keys (no duplicate bank lines) | Hand-written checks | Built in | Built in |
| Finding lines by date or account over five years | Load everything | Fast | Fast |
| Schema changes over time | Hand-written | Numbered migrations | Numbered migrations |
| Protection if the Mac is lost | FileVault only | FileVault only | FileVault, plus the file's own key |
| Effort | Low at first, high later | Low | Low to medium. Native build to check |

## Why The Choice Matters

Plain files are the one option that puts the books at risk, because a crash can break them. Moving from SQLite to encrypted SQLite later is a small change. Moving from plain files to SQLite later means migrating real books.

## Recommendation

- **Choose one SQLite file.** It is still "inside the app": one file in the app's own folder, no server, nothing online. It is what Apple's own apps use for their data.
- **Encryption:** start with FileVault only during development, which uses invented data. Decide on a SQLCipher-compatible build before folder 12, once spec 001 confirms one works with the chosen shell on Apple silicon. If the client's Mac does not have FileVault on (client question 12), file encryption becomes required.

## Check Before Deciding

1. Whether a maintained SQLCipher-compatible build of `better-sqlite3` supports the chosen Electron version on Apple silicon. To check at spec 001, with the date.
2. Whether FileVault is on for the client's Mac (client question 12).

## Decision

- **Chosen:** one SQLite file in the app's data folder, as recommended. Encryption at rest stays open, decided before folder 12.
- **Date:** 2026-11-22
- **Decided by:** the author, when asked before spec 001.
- **Reason:** everything stays inside the app on his Mac, with transactions and integrity checks the books need. Development uses invented data only, so FileVault is enough until go-live.
- **Still to check at spec 001:** item 1 above (a SQLCipher-compatible build), recorded with the date.
- **Files updated:** this note, `progress-tracker.md`.
