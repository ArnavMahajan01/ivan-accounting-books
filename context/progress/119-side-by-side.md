# 119: Open Side by Side in Chrome

Spec: [119](../feature-specs/09-demo-7-google-sheets/119-side-by-side.md)
Status: Implemented, check deferred (the test account needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `SideBySide`: **Open side by side** opens the workbook in his web browser, and the screen says in one sentence how the Mac tiles two windows: "To work side by side, hold the pointer over the green button at the top left of the Chrome window, choose Move & Resize, then Left & Right, and pick Accounting Books for the other half." The app does not move any other app's window.
- Shown after publishing (beside Open in Google Sheets) and in the sheet panel's bar.

## Verified

- `npm run check` passes. `publish.test.tsx`: Open side by side opens the workbook again and shows the sentence.
- In the built app: the button is in the panel's bar (screenshot looked at).

**Not checked:** with the test account, that the workbook opens and tiles beside the app (needs spec 106). The Move & Resize menu is in recent macOS versions; on an older one he drags the windows.
