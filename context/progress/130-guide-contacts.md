# 130: guide-contacts-and-invoices

Spec: [130](../feature-specs/10-demo-8-contacts-and-invoices/130-guide-contacts.md)
Status: Done
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- **New Help group:** "Invoices and contacts" (`GUIDE_GROUPS`), after Reports and BAS. It holds three new guides:
  - **Your customers and suppliers:** how contacts are saved; the list, search and "Added"; a contact's page and tabs; Edit details; the summary from Invoices; New contact; tidying duplicates with Merge and Keep both. It says to check the pair is the same business before merging.
  - **Bring in invoices from the Admin Dashboard:** "Ways to do this": link the folder in Settings and use Add to books, or Import file. Then the preview, what the Invoices page shows, Home's overdue job, and GST counted when paid on the cash basis.
  - **Match a customer's payment:** Match, Choose an account instead, Split across invoices for part payments and several invoices, an overpayment to an account, and Undo.
- Each guide ends with "If something goes wrong". Each has one QuickBooks line where it helps.
- **Eight images** in `guides/images/`, all under 160 KB. They were taken from the built app at 1440 wide, with the sample books, the Demo 4 file and the invoice fixture, then cropped and halved: `contacts-list`, `contact-page`, `merge-contacts`, `admin-dashboard-card`, `invoice-import`, `invoices-page`, `match-invoice`, `split-invoices`.
- **Getting started:**
  - It no longer says some pages are empty ("Coming in a later version"); every page is built.
  - It now names Rules, Invoices and Contacts.

## Verified

- `npm run check`: 1,293 tests pass. The guide check validates all three guides and their image files.
- **Steps followed in the built app** by a script that also took the images: import the fixture with its preview; link the fixture folder in Settings; the To review deposit showing its invoice; Split across invoices with $2,640.00 on INV-1062; New contact; the pair offered, with Merge and Keep both; a contact's page.
- Steps checked earlier in the built app rather than in this script: Match itself and "Paid 22/11/2026" (spec 129), and the arrived-invoices message with Add to books (spec 127).

**Not checked:**
- Clicking Merge through in the built app (covered by the tests in 124).
- The guides opened in Help to look at.
- A read for plain wording by the author.
- The contacts list image starts just below the page title, because the page scrolls a little when it opens. The image shows the pairs, tabs and list.
