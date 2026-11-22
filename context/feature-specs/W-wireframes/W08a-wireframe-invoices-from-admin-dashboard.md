# W08a: Wireframe: Invoices From the Admin Dashboard

Wireframes for bringing issued invoices from the client's Admin Dashboard app into the books, tracking who owes what, and matching payments. Added on 2026-11-22 from the author's screenshots of the client's QuickBooks (`references/imagesforaccountant/`, structure only). The screenshots show he has customers with open and overdue invoices, and the author asked on 2026-11-22 whether the two apps can be connected. See `decisions/admin-dashboard-link.md`.

Part of the client review pack. It follows W08 and comes before the W10 meeting.

Note (2026-11-22): Option 4 now also splits one deposit across several invoices, or part of one, at the author's request.

## Depends On

- W08

## Implementation

1. Make 5 black-and-white options in `wireframe/2211-invoices-from-admin-dashboard/` with the wireframe skill, Wireframes only.
2. Cover: importing a file; a linked folder; a Customers page with balances; matching a bank deposit to an invoice; a sketch of making invoices in this app instead.
3. Take only layout and structure from the author's QuickBooks screenshots. Every name, payee, number and amount is invented, matching W03 to W09.
4. Add it to `wireframe/index.html`, and a section to `context/wireframe-feedback.md`.

## Scope Limits

- Quotes do not change the books, so they are information only.
- Needs a matching export in the Admin Dashboard project, which is separate work there.

## Builds Into

- Specs 125 to 129, once `decisions/admin-dashboard-link.md` is decided.

## Check When Done

- The wireframe opens from `wireframe/index.html` and every tab works.
- No name, number or amount from the screenshots appears in it.
- The author has clicked through all 5 options.
