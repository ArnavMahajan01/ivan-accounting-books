# 126: Import Invoices From a File

Spec: [126](../feature-specs/10-demo-8-contacts-and-invoices/126-invoice-import.md)
Status: Done (built ahead of its gate; see 125's Notes)
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- Migration `0016-invoices.sql`: `invoice` (each issued version: number, version, kind, contact, dates, GST-inclusive total and GST, credit note's invoice, PDF name, current or replaced, its journal entry, the file's hash; `UNIQUE (number, version)`) and `invoice_line`. Two account roles, `receivables` (1100) and `sales` (4000), in the chart template and filled in for existing books (`account_role` made again with the wider CHECK).
- `src/domain/invoice-entry.ts` (pure): an invoice as accounts receivable up by the total, sales up by each line before GST with its GST code, and GST on sales; a credit note the other way round. The GST is the Admin Dashboard's own, per line.
- `src/services/invoice-import.ts`: the preview (new, already in, a newer version with the old and new total, refused: a locked period, an older version, an unknown GST code; quotes counted) and the commit, all or nothing in one transaction, each through the posting service with an `invoice.add` or `invoice.replace` audit row. A newer version changes the same entry in place (`changeEntry`, its own audit row). A customer the books do not have is saved as a contact, from an invoice, with the email and ABN.
- **Cash basis BAS:** `src/services/bas-lines.ts` is now what the BAS worksheet, its drill-down and the quarter close add up from. On the cash basis an invoice posted to accounts receivable is left out on its own date (its GST counts when paid, spec 129); a sale paid straight into the bank still counts. The note under the BAS says so.
- Screens: **Invoices** and **Contacts** join the sidebar after Rules, as in the signed-off wireframe (Contacts says "Coming in a later version" until spec 123). The Invoices page (W08a, Options 2 and 3): Import file, the preview in sentences and a table (new contacts marked, credit notes named as such, quotes left out), then Unpaid, Overdue and Paid in the last 30 days, and each invoice with its status in words.
- **Choice made where the spec left room:** with eleven pages before Settings, Command-1 to Command-9 now run from Home to Contacts; Shared sheets and Accountant changes are in the View menu and sidebar without a number key. The tests that said every page has a shortcut now say the first nine, Settings and Help do; Getting started says so.

## Verified

- `invoice-import.test.ts` with the sample books and the fixtures: the preview (the quote left out, the new customer); four posted, the new contact with its details, four audit rows, the trial balance balanced; the same file twice adds nothing; version 2 changes the same entry in place with `entry.change`, and a credit note posts; on the cash basis the BAS is unchanged by unpaid invoices; an invoice dated in a locked period is refused. `invoice-entry.test.ts`: the entry, a credit note, GST-free, an unknown code. `invoices.test.tsx`: the bands and statuses, the preview's sentences, Import only on click, a file's problem named.
- `npm run check`: 1,245 tests.
- In the built app at 1100: imported the first fixture through Import file (preview, then "Added 4 invoices", the bands and statuses), and previewed the second (already in, INV-1064 replaced $6,600.00 to $7,150.00, the credit note). Looking caught the credit note called a "new invoice", and every fixture invoice overdue; both fixed.

## Notes

- The Home "GST owing" figure reads the GST account, so on the cash basis it includes an unpaid invoice's GST from its invoice date. Recorded as a follow-up.
