# 128: Customers' Balances and Overdue Invoices

Spec: [128](../feature-specs/10-demo-8-contacts-and-invoices/128-customer-balances.md)
Status: Done
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- `src/services/invoices-view.ts` (built with 126): what is still owed on each invoice (the total, less the credit notes for it and, from spec 129, the payments matched to it) and where it is up to in words: "Unpaid · due 12/12/2026", "Overdue · 25 days", "Paid 15/11/2026", "Credit for INV-1062". The bands: Unpaid, Overdue, Paid in the last 30 days. Overdue is shown in words and colour, never colour alone.
- Home's to-do list gains **"1 invoice overdue"** ("$6,600.00 is past its due date and not paid yet", See invoices), shown only while an invoice is overdue, so a business without invoices sees no extra row.
- The contact pages' figures come from the same view (spec 123).

## Verified

- `invoices-view.test.ts` with the sample books and the fixture: unpaid with its due date; overdue by 25 days; a credit note lowers its invoice's balance and shows as a credit; the bands add up; Home has the job. `next-steps.test.ts`: the job while overdue, and none otherwise. `invoices.test.tsx`: the bands and words on screen. `npm run check`: 1,253 tests.
- In the built app (with 127): the bands and statuses after importing the fixture.

**Not checked:** Impeccable `critique` of the Invoices page runs with the folder's pass before Demo 8. "Paid" is tested with spec 129.
