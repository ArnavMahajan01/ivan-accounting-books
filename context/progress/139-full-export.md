# 139: Full Data Export

Spec: [139](../feature-specs/11-demo-9-settings-help-backup/139-full-export.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- `src/services/full-export.ts` writes everything in the books as CSV, with a README.txt that describes each file and how amounts and dates are written:
  - `accounts.csv`;
  - `entries.csv`: one row per line, with Debit, Credit, GST, GST code, payee and note;
  - `bank-accounts.csv`;
  - `contacts.csv`: with their details;
  - `invoices.csv`;
  - `rules.csv`: conditions and splits as JSON text.
- It uses the same safe CSV as the report exports (`domain/csv.ts`): plain numbers with two decimals, DD/MM/YYYY, and no text cell can run as a formula.
- `allLinesForExport` in `journal-queries.ts` reads every line, read-only.
- Bridge `export.all`: main asks where, makes a folder "Accounting Books export 2026-11-28 1538" there, and writes the seven files. Only the folder's name comes back to the screen.
- Settings, About: **Export all data…**, then "Exported 7 files to the folder …".

## Verified

- `full-export.test.ts`:
  - the seven files;
  - **adding the exported lines back up reproduces the trial balance**: Debit less Credit by account code from the CSV alone equals every trial balance row, both ways, and the whole sums to zero;
  - invoices and contact details are there;
  - no cell starts with `=`, `+` or `@`.
- Settings screen test for the button and the message.
- In the built app, the export wrote the folder with all seven files (274 lines of entries). I read the start of entries.csv and accounts.csv.

**Not checked:** opening the files in Numbers or Excel by hand.
