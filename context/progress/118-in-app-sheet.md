# 118: Google Sheet Inside the App

Spec: [118](../feature-specs/09-demo-7-google-sheets/118-in-app-sheet.md)
Status: Implemented, check deferred (signing in to the test account inside the panel needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `src/main/sheet-panel.ts`: a `WebContentsView` in the main window with its own persistent session (`persist:google-sheet`), no preload and no bridge, sandboxed, context isolation on, Node off, developer tools off, and every permission request, check and device request denied on its session.
- Navigation (`src/main/index.ts`, `src/main/navigation.ts`): the existing guard on every web contents now lets the panel alone go to `https` pages on `google.com`, `gstatic.com` and `googleusercontent.com` (and their subdomains); everything else is still only the app's own address. New windows stay refused. No user-agent or other trick to get past Google's block.
- Settings, Google card: "Open sheets inside the app. If Google does not allow it there, the app says so and opens Chrome instead." Off until he ticks it; kept in `app_meta` (`src/services/sheet-panel-setting.ts`). Turning it off closes the panel. Disconnect clears the panel's session (its Google sign-in and cookies).
- Shared sheets: **Open here** on each sheet while it is on. The panel view has the sheet's name, **Open side by side** and **Open in Chrome** (always one click away), and the area the main process puts Google's page over, moved with the window (`sheetPanel.open`, `move`, `close`). If the page does not load, "The sheet could not open inside the app. It is safe in your Google Drive. Open it in Chrome instead." Leaving closes it.
- As the author decided, the app shows no security warning about this (risk G7 is explained in person).

## Verified

- `navigation.test.ts`: Google's pages over https are allowed for the panel; `http`, look-alike hosts (`docs.google.com.evil.example`, `evilgoogle.com`), the app's own address and `javascript:` are not. `shared.test.tsx`: Open here only when on; the fallback and Open in Chrome; leaving closes the panel.
- In the built app with `GOOGLE_FAKE=1` at 1100: ticked the setting, opened a sheet here; the panel's own web contents (captured from the main process) showed Google's own Sheets page, at `https://docs.google.com/spreadsheets/d/<id>/edit`, saying the file does not exist, as expected for the in-memory Google's invented id. Only that invented id left the Mac.

**Not checked:** on the test account, whether Google lets him sign in inside the panel and edit, or refuses; either is to be recorded here (needs spec 106). A Google "file not found" page counts as opened, not as the fallback: the fallback is for a page that does not load.

## Notes

- "Open in Chrome" is the signed-off wireframe's wording; it opens his default browser, which is Chrome if that is his default.
