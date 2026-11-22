# W08: Wireframe: Invoices and Bills

Wireframes for invoices and bills, built only if the client uses them in QuickBooks today.

Note (2026-11-22): the author's QuickBooks screenshots show customers with open and overdue invoices, and products and services for invoicing, but no bills. His invoices and quotes are made in the Admin Dashboard, so W08a covers bringing them in. This spec waits for `decisions/admin-dashboard-link.md` (option D would need it).

## Decide First

- Client question 1: which QuickBooks screens he uses. If he does not use invoices or bills, mark this spec "not needed" in the progress tracker and skip it. If he uses other screens not covered by W03 to W09 (for example inventory or projects), add a new W spec for each, with a letter suffix (`W08a`).

## Depends On

- W07

## Implementation

1. Run `/wireframe` for "the Invoices list, creating an invoice with GST, and the Bills list", choosing Wireframes only, covering only the parts client question 1 confirms.

2. Check the options cover: invoice number, customer, lines with GST codes, totals with GST shown, a PDF preview, and paid or overdue status in words, not colour alone.

3. Record the option names and the recommendation in the progress file.

## Scope Limits

- No online payments (future idea F06).
- No recurring invoices or reminders unless client question 1 confirms them.

## Check When Done

- The wireframe opens and every tab works.
- Invented customers and amounts only.
