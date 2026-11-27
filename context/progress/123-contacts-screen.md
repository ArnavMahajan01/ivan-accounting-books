# 123: Contacts List and Contact Page

Spec: [123](../feature-specs/10-demo-8-contacts-and-invoices/123-contacts-screen.md)
Status: Done
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- `src/services/contacts-view.ts`:
  - `contactsView`: every contact in use, with what customers owe and where their oldest unpaid invoice is up to, and what was paid to suppliers this financial year with their latest bank line.
  - `contactPage`: owes you (every invoice, with the next due date), invoiced this financial year (less credit notes), paid this financial year (matched payments), their invoices, payments, bank lines (newest 200; the count of the rest), details and the linked bank words.
  - The figures come from `invoicesView` and the Transactions query, so they agree with the Invoices page and Transactions.
- The Transactions query takes two new optional filters: a contact (an entry with a line for them), and bank lines only.
- Bridge: `contacts.list`, `contacts.get`, `contacts.add` and `contacts.edit`. The last two give spec 122's services a screen.
- `src/renderer/contacts/`:
  - The Contacts page: Customers and Suppliers (a contact that is both is in each), search by name, "Added" ("from an invoice, 15/10/2026"), and New contact.
  - The contact page (`#/contacts/<id>`): ‹ Contacts, Edit details, the three figures, and the tabs Invoices (with the PDF button), Payments, Bank lines and Details, plus the linked words. A supplier with no invoices opens on its bank lines, without the invoice figures.
  - `ContactPanel`: a customer's name on the Invoices page opens their summary beside the list, with Open full page (W08b, Option 3).
- Invoices page: the customer name is a button opening the summary. The status column may wrap, so the table fits at 1100 wide.
- The Contacts placeholder page is gone, and with it the last "coming in a later version" test case in `pages.test.tsx`. Every page is now built. `EmptyPage` is kept: `COMING_LATER` is still used by Settings and Getting started.
- Layout sweep: imports the invoice fixture, then checks Invoices, Contacts, a contact page and the summary panel at the four sizes.

## Verified

- `contacts-view.test.ts` (6): customers' owing and oldest unpaid; suppliers' spending and latest line; invoiced = paid + owing after a part payment, and with a credit note; only their invoices and bank lines, newest first; details; an unknown contact gives null.
- `contacts.test.tsx` (11): the list in words, Suppliers and search, New contact (saved and opened, and a refusal in words), empty state, the page's figures and tabs, Edit details reloading, a supplier opening on bank lines, the summary from the Invoices page, and the address and ABN helpers.
- `npm run check`: 1,278 tests pass. `npm run format:check` is clean.
- `npm run test:layout`: passes at 1100, 1280, 1440 and 1700 wide. The screenshots were looked at: the list, Smith Renovations' page, and Coastal Body Corporate's summary at 1100. At 1100 the summary first cut off Open full page, and long names first wrapped and then made the table scroll sideways. Each was fixed and checked again.
- Design checks by hand: names are links or buttons with visible focus, overdue is said in words as well as colour, amounts are right-aligned with tabular figures, and money out on a contact's bank lines has a minus sign.

**Not checked:** dark theme, and the Impeccable `critique` and `audit` commands themselves. Both are left for the folder's Impeccable pass before Demo 8 (spec 131), as with 126 to 129. Clicking a name elsewhere, such as Transactions' payee or a To review line, does not open the summary yet; only the Invoices page does. Recorded as a follow-up.
