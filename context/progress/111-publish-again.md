# 111: Publish Again Into the Same Workbook

Spec: [111](../feature-specs/09-demo-7-google-sheets/111-publish-again.md)
Status: Implemented, check deferred (the manual test needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- Publishing the same report and period again finds its link, checks the file in Drive, reads the workbook's tabs (the app's by their marker), and writes only the app's ranges through `planWorkbook` (spec 109). The link, the file id and its sharing stay.
- A workbook deleted (trashed) or out of reach in Drive is marked `missing` (audited) and the sheet says "This workbook is no longer in your Google Drive. It may have been deleted. Publish it as a new workbook, with the same name." with **Publish as new**, which makes a new workbook and points the same link at it.
- What changed: every published row keeps a short fingerprint, so the result says "Updated in place. 2 rows changed, 1 row added since last time." (or "Nothing changed since last time."), and "Your own tabs were left as they were: …".

## Verified

- `publish.test.ts`: publishing again updates the same file in place (`isNew` false, one spreadsheet in Drive), keeps his own tab ("My workings", its cell untouched) and his writing in column H of the app's tab, and says nothing changed; a trashed workbook gives `missing`, and Publish as new makes a fresh one on the same link. `publish.test.tsx`: the words for changes and kept tabs, and Publish as new.
- In the built app with `GOOGLE_FAKE=1`: published the profit and loss twice; the second time said "Updated in place. Nothing changed since last time." (screenshot looked at).

**Not checked:** the manual test in real Sheets (add a tab and a column, publish again, both still there). Needs spec 106.
