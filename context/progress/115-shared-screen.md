# 115: Shared Sheets Screen: By Person

Spec: [115](../feature-specs/09-demo-7-google-sheets/115-shared-screen.md)
Status: Implemented, check deferred (needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `SharedSheetsPage` (W07, Option 2 "People First"): one card per person, "accountant@… can see 2 sheets", with **Stop sharing everything**; a row per sheet with when it was published, the role changed right in the row, Open in Google Sheets, and Stop sharing; then **Only you**, published but not shared, with Publish again and Share…; a workbook gone from Drive is listed there with Publish as new. Share… and Ready formulas in the toolbar. Every row button's name includes its sheet, for screen readers.
- People come from Drive's permissions on the app's files, asked every time the page opens (bridge `sheets.people`); a file Drive no longer knows is marked missing. Change role (`sheets.changeRole`), stop sharing one (`sheets.unshare`) and everything with a person (`sheets.unshareAll`), each stop after a confirmation saying the sheet stays in his Google Drive.
- Not connected, or offline: the page lists the published sheets, says why it cannot show who can see them (with a link to Settings), and Share… is off.

## Verified

- `sharing.test.ts`: grouped by person in listing order; change a role; stop one (it moves to Only you); stop everything for a person, whatever the case of the email; not connected. `shared.test.tsx`: the heading and roles, change in the row, the confirmation's words, the not-connected state.
- In the built app with `GOOGLE_FAKE=1` at 1100, light and dark: looked at after sharing one sheet.

**Not checked:** changing and removing roles with the second test account and seeing it lose access (needs spec 106). Impeccable `critique` and `audit` of the page run with the folder's pass before Demo 7.
