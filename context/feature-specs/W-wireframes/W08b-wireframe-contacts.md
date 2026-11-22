# W08b: Wireframe: Contacts, Saved Automatically, With a Page for Each

Wireframes for customers and suppliers. Contacts are saved automatically the first time a name appears on a bank line or an invoice, so he never types them twice, and later lines from the same place are filled in. Clicking a contact opens a page with what they owe and all their invoices, payments and bank lines. Added on 2026-11-22 at the author's request.

Part of the client review pack. It follows W08a and comes before the W10 meeting.

## Depends On

- W08a

## Implementation

1. Make 5 black-and-white options in `wireframe/2211-contacts/` with the wireframe skill, Wireframes only.
2. Cover: the contacts list with where each contact came from; the contact page with balances, invoices, payments and bank lines; saving as you go in To review, with Undo; a side panel from any page; a timeline; merging likely duplicates.
3. Invented data only, matching W03 to W09 and W08a.
4. Add it to `wireframe/index.html`, and a section to `context/wireframe-feedback.md`.

## Scope Limits

- Saving a contact is not a ledger change. Merging contacts moves their links and is recorded in the history.
- Invoices come from the Admin Dashboard (W08a, `decisions/admin-dashboard-link.md`).

## Builds Into

- Specs 071 (payees saved as he types), 122 to 124 (contacts, contact page, merging).

## Check When Done

- The wireframe opens from `wireframe/index.html` and every tab works.
- The author has clicked through all 5 options.
