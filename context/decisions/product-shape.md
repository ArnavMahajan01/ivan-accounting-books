# Desktop App Or Web App, And One Client Or Many

**Status:** Decided: a Mac desktop app with local data, for one client first

This decides where the app runs, where the books live, and how much of the scale version is built now. It does not decide the shell technology (`desktop-shell.md`) or the storage format (`local-data-storage.md`).

## The Options

- **A hosted web app:** one server and database, every client signs in. Considered on 2026-11-21 when the scale version came up.
- **A desktop app with local data:** each client installs the app, and their books live in a file on their own computer.
- **Build for many clients now, or one client now:** design for many, but build only what the first client needs.

## Comparison

| Topic | Hosted web app | Desktop app, local data |
|---|---|---|
| Where the books live | On a server the developer runs | On the client's Mac |
| Privacy | The developer holds every client's books | Each client holds his own |
| Running cost | Hosting and a database, growing with clients | None |
| Work outside the code | Accounts, sign-in, separating clients, uptime, breach response | Signing, notarizing, updates, backups on the device |
| Risk | One breach exposes every client | A lost Mac without backups loses that client's books |
| Google Sheets editor inside the app | Possible in a browser, but unreliable (cookies) | Unreliable (Google blocks embedded sign-in) |

## Why The Choice Matters

It decides most of the architecture: a server, sign-in and tenant separation would have been most of the work. It can be changed later, but only at the cost of a rebuild of the data layer. The scale version does not need a server, since each client can have his own install.

## Recommendation

A hosted web app was described on 2026-11-21 as an option for the scale version. The author chose the desktop app with local data instead.

## Check Before Deciding

1. Electron on macOS can keep data in the app data folder and secrets in the Keychain. Known from the kit's `desktop-app.md`, written from two Electron apps on macOS. To confirm at spec 008 against the installed version.

## Decision

- **Chosen:** a Mac desktop app. The books live in the app's data folder on the client's Mac. No server and no hosted database. Build for one client now. The scale version (other clients, each with their own install, licensing and purchase history through third-party tools) comes later, and nothing of it is built or shown now. The code must not hardcode anything client-specific, so the scale version can follow.
- **Date:** 2026-11-21
- **Decided by:** the author
- **Reason:** the client wants his own application with his data on his computer. One client needs no server. Keeping the scale version out of his app keeps it simple and avoids one feature breaking another.
- **Files updated:** `project-overview.md`, `architecture-context.md`, `CLAUDE.md`
