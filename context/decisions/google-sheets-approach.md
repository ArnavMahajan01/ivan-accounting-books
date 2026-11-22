# How Google Sheets Fit Into The App

**Status:** Decided by the author on 2026-11-22: B, with A offered as an optional panel

This decides how the client and the accountant work with Google Sheets, and how sheet edits reach the books. It does not decide which reports are shared (client question 6) or which columns the accountant may edit (client question 7).

The author asked on 2026-11-21 whether a Google Sheet can sit inside the app, be worked on there, and update automatically.

## The Options

- **A. The real Google Sheets editor inside an app window.** The app loads docs.google.com in a built-in browser window.
- **B. The app's own spreadsheet-style screens, with sheets published from the app.** The books are edited in the app. Reports are written to Google Sheets and shared. The accountant's edits to allowed columns come back as proposals. An "Open in Google Sheets" button opens the real sheet in the browser.
- **C. Google Sheets as the books.** The app reads and writes the sheets directly, and keeps no local copy.

## Comparison

| Topic | A. Editor in a window | B. Own screens and publish | C. Sheets as the books |
|---|---|---|---|
| Works reliably | No. Google often refuses sign-in inside embedded windows | Yes | Yes |
| Books stay correct | Depends on sheet edits | Yes, the ledger rules apply to every change | No. Anyone with edit access can break a formula or delete a row |
| Works offline | No | Yes, apart from publishing | No |
| Fits "data on his Mac" | Partly | Yes | No |
| Accountant's experience | Normal Google Sheets | Normal Google Sheets | Normal Google Sheets |
| Effort | Low to try, high to make reliable | Medium | Medium, and ongoing repair |

## Why The Choice Matters

It decides whether the books can be trusted. Option C breaks the "books always balance" rule. Option A cannot be relied on. Option B can later add a read-only embed of a published sheet if wanted, without changing anything else.

## Recommendation

- **Choose B.** The app's file is the truth. Sheets are published copies, shared per file at the role the client picks. Edits from the accountant come back to the app every two minutes while it is open, and wait for the client to accept them.
- Updates are automatic in one sense: Google saves every edit as it is typed, and the app picks it up on its next check. They are not automatic in the books, on purpose.

## Check Before Deciding

1. Google blocks sign-in in embedded browser windows. Seen in community and vendor reports read on 2026-11-21 (`research-notes.md`). Not tested here.
2. `drive.file` lets the app read changes and set sharing on files it created. To confirm at spec 106.

## Decision

- **Chosen:** B as the base: the app's own screens, publishing to a workbook, and accountant edits as proposals. Added on top:
  - A, the real Google Sheet in a panel inside the app, as an option he can turn on. If Google refuses the sign-in there, the panel says so and opens Chrome instead (spec 118).
  - Free-form work in the real sheet. Publishing again updates the same workbook and never touches his own columns or tabs (specs 109 to 111).
  - A sheet-style preview before publishing (spec 112), and a Ready formulas tab (spec 113).
- **Date:** 2026-11-22
- **Decided by:** the author
- **Reason:** the client wants free-form spreadsheet work, with rows, columns, formulas and conditions, and ready-made formulas because he is not technical. The books stay correct, because nothing typed in a sheet changes them until he accepts it.
- **Not shown in the app, by the author's choice:** the reliability and Google-policy risk of the in-app panel. The author explains it to the client in person. Recorded as G7 in `security-risks.md`.
- **Files updated:** `project-overview.md` (Features, Out Of Scope), `security-risks.md` (G7), `feature-specs/README.md` (specs 109 to 113, 118), W07a. `architecture-context.md` is updated when spec 111 is written.
