# 110: Publish a Report to a New Workbook

Spec: [110](../feature-specs/09-demo-7-google-sheets/110-publish-new.md)
Status: Implemented, check deferred (the manual run against the test account needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- Migration `0013-sheet-links.sql`: `sheet_link` (id, Google file id, report kind, title, the request with its period pinned, period, last published at, last published hash, rows per app tab, a fingerprint of every published row and the editable values of transaction rows, his tabs at the last publish, status). One workbook per report and period (`UNIQUE (kind, period_from, period_to)`). Repository `src/data/sheet-link-repository.ts`; service `src/services/sheet-links.ts` (each write with its audit row, `sheet.publish` and `sheet.missing`; the figures are never in the audit).
- `src/domain/sheet-tabs.ts`: the period pinned to its whole span ("This quarter" becomes Oct–Dec 2026, so publishing again in December updates the same workbook), the workbook's name ("Profit and loss · Oct–Dec 2026"), a report as the app's tab, and the Transactions tab. Every app tab starts with the business, the report and period, and "Published from Accounting Books on … A copy of the books: changing it here does not change them. Publishing again refreshes rows 1 to N of columns A to X; your own columns, rows below and tabs are kept."
- `src/services/sheet-content.ts`: the content of a workbook from the books (the report through `getReport`, or one row per entry for the transactions), plus the Ready formulas tab (spec 113).
- `src/google/publish.ts`: the first publish makes the "Accounting Books" folder once, then the workbook in it, links it, then writes. Values are written with `valueInputOption=RAW` (`http-google.ts`), amounts as numbers with two decimals and dates as Sheets day numbers with `dd/mm/yyyy`, so the accountant can add and sort. The app's range on each tab is protected; on the Transactions tab the Account, GST and Note columns are left open for an editor (client question 7's assumption).
- Bridge `sheets.publish` and `sheets.open` (opens the workbook in his normal browser, https only). The report screen's Publish to Google Sheets button (greyed until now) opens the publish sheet. **Choice made where the spec left room:** the Transactions page has its own Publish to Google Sheets button, publishing the categorised transactions for a quarter or year, as the signed-off W07 wireframe shows "Transactions · Oct–Dec 2026" as its own sheet. The result says "Published to a new workbook in the "Accounting Books" folder in your Google Drive", with Open in Google Sheets.
- A custom range that is exactly a quarter or financial year is now named after it (`resolvePeriod`), so a pinned workbook's column reads "Oct–Dec 2026" as on the screen.

## Verified

- `npm run check`: 1,191 tests. `publish.test.ts` against the in-memory Google with the sample books: folder and workbook made, tabs "Profit and loss" and "Ready formulas", Google's blank tab removed, pinned to 01/10/2026 to 31/12/2026, heading rows written, audit row; nothing sent or linked while Google is not connected; the Transactions workbook has a row per entry with its Ref. `http-google.test.ts`: the values go with `valueInputOption=RAW`, so a description `=HYPERLINK(…)` is sent as text; the protection leaves exactly the editable column open.
- In the built app with `GOOGLE_FAKE=1`: connected in Settings, published the profit and loss from its report screen, saw "Published to a new workbook…" and Open in Google Sheets (screenshot looked at).

**Not checked:** the manual run against the test account: publish, open in the browser, see the figures, and a description starting with `=` showing as text in real Sheets. Needs spec 106. The protection's behaviour for an editor (that only Account, GST and Note can be changed) is checked with the second test account at spec 114.
