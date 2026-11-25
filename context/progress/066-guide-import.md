# 066: Guide: Import a Westpac File

Spec: [066](../feature-specs/05-demo-3-bank-import/066-guide-import.md)
Status: Done (read for plain wording by the author pending)
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `guides/import-a-westpac-file.json` ("Bring in a Westpac statement", in a new group, "Bank"): download the file from Westpac Online Banking (Overview, Exports and reports, Export in the Transactions section, one account, OFX), bring it into the app (Bank, Import file or drag it in, read the sheet, the closing balance line, See all lines, Import), what happens when the same lines come twice, and what each message means. Two images, `bank-page.png` and `import-sheet.png`, from the sample books.
- The Westpac steps are the words of Westpac's public help page "Export Transaction Lists, Payees, and Accounts Online", read on 2026-11-24 and recorded in `research-notes.md`. The page does not say what the date format options are: client question 31.
- Updated for what changed: `getting-started.json` (the Bank page, and a pointer to the new guide), `reading-your-books.json` (Bank balance opens the Bank page), and the four older images, retaken because Home's Import file button is no longer greyed.

## Verified

- `npm test` (guide validation, every image present and under 300 KB, plain text only): passes.
- Every app step was followed in the packaged app by the end-to-end test and in the real app by script, with the button and message names as written. The Westpac steps could **not** be followed: they are Westpac's, in a signed-in session, and no real account was used.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- The retaken images show the sample books on the day they were taken, 24 November 2026, so their figures differ a little from the 23 November figures in the wireframes.
