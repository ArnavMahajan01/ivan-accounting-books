# 013: Packaged Mac App and Fuses

Builds the real Mac app now, so packaging problems show up early, and every demo runs the same kind of app the client will use.

**Client sees:** nothing yet. This is the app every demo uses.

## Depends On

- 012

## Implementation

1. `npm run package` makes an unsigned `.app` for Apple silicon in `release/`, from a whitelist: built main, preload and renderer, production dependencies only.
2. Developer tools off in packaged builds, debugging flags refused, risky Electron fuses off. Check the installed version's fuse list first, and record which were turned off.

## Scope Limits

- No signing, notarizing, installer or updates (folder 12).

## Check When Done

- The `.app` opens from Finder and shows the version and "integrity: ok". (Unsigned: right-click, Open, the first time.)
- Its data folder has no ` Dev` suffix.
- The progress file lists the fuses turned off and the app size.
