# Which Desktop Shell

**Status:** Decided by the author on 2026-11-22: Electron

This decides the technology the Mac app is built with. It affects every phase. It does not affect the accounting rules in `src/domain/` and `src/import/`, which are plain TypeScript and would move to any of these.

## The Options

- **Electron:** web screens in a Chromium window, with a Node main process. TypeScript throughout.
- **Tauri:** web screens in the system's WebKit view, with a Rust core. Much smaller app.
- **Native SwiftUI:** a fully native Mac app in Swift.

## Comparison

| Topic | Electron | Tauri | SwiftUI |
|---|---|---|---|
| Fit with the kit | `desktop-app.md` was written from two Electron apps | Partly | No kit rules |
| Language | TypeScript only | TypeScript plus Rust | Swift |
| SQLite | `better-sqlite3`, mature | Through a Rust plugin | Native, mature |
| Google client | Google's Node client | Rust or plain HTTPS | Plain HTTPS |
| Secret storage | `safeStorage`, backed by the Keychain | Keychain through a plugin | Keychain directly |
| App size | Large (about 100 MB or more) | Small | Small |
| Windows later (F04) | Same code | Same code | A rewrite |
| Speed of building with a model | Fastest. The most examples and libraries | Slower | Slower for this team |
| Feel on the Mac | Good with care | Good | Best |

## Why The Choice Matters

It is the most expensive choice to reverse after Demo 1 (folder 02), because the shell, bridge, packaging and screens all depend on it. The domain and import code would survive a change.

## Recommendation

- **Choose Electron** if speed of building, one language, a future Windows build and the kit's existing rules matter most. This is the better fit for this project.
- **Choose Tauri** if app size matters more than speed of building, and Rust is acceptable.
- **Choose SwiftUI** only if the app will never need Windows and the author wants the most native feel.

## Check Before Deciding

1. The current stable Electron version and its security guidance. To check at spec 001, with the date.
2. That `better-sqlite3`, or the encryption build chosen in `local-data-storage.md`, supports that Electron version on Apple silicon. To check at spec 001.
3. That `safeStorage` on macOS survives an app update with the same signing identity. To check at spec 107 (risk B3).

## Decision

- **Chosen:** Electron, as recommended.
- **Date:** 2026-11-22
- **Decided by:** the author, when asked before spec 001.
- **Reason:** fastest to build in one language (TypeScript), fits the kit's desktop rules, leaves a Windows build possible (F04), and matches the client's Admin Dashboard, which is also Electron.
- **Still to check at spec 001:** items 1 and 2 above, recorded with the date in 001's progress file.
- **Files updated:** this note, `progress-tracker.md`. `CLAUDE.md` section 2 and `architecture-context.md` get the real versions at spec 001.
