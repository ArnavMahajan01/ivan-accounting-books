# 122: Contacts: Data and Automatic Saving

Spec: [122](../feature-specs/10-demo-8-contacts-and-invoices/122-contacts-data.md)
Status: Done
Date: 2026-11-27
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- Migration `0015-contact-details.sql`: email, phone, ABN (11 digits, checked by the database's shape and by `parseAbn`'s check digits) and notes, all optional. Where a contact was first seen was already kept (`created_from`: a bank line, an invoice or by hand, and `created_at`).
- `src/data/contact-repository.ts`: `getContactDetails`, `updateContactDetails`, `updateContact`. The details are kept beside the contact, so the three places that make contacts (the sample books, saving a payee from a bank line in spec 071, adding one) stay as they were.
- `addContact` takes optional details (an invoice gives the email and ABN, spec 126). `src/services/contacts.ts`: `addContactByHand` and `editContact` (name, customer or supplier, details), each with an audit row (`contact.add`, new `contact.change`); a wrong ABN or email is refused, and a blank is none.

## Verified

- `contacts.test.ts`: by hand with details and an audit row; from an invoice; wrong ABN and email refused, blanks as none; edit with a unique name and an audit row. `review.test.ts`: a payee saved from a bank line says it came from a bank line. 83 tests in those files pass; `npm run check` passes.

## Notes

- Folder 10 is built in the order 122, 125 to 129, then 123 and 124, because the contact page's figures (owes you, invoiced and paid) come from the invoices and payments of 126 to 129. Each spec is still recorded and committed on its own.
