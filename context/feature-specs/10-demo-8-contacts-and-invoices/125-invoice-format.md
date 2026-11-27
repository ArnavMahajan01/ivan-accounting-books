# 125: Invoice Exchange File

The file format the Admin Dashboard writes and this app reads: issued invoices and credit notes.

**Client sees:** nothing.

## Decide First

- `decisions/admin-dashboard-link.md` and client questions 24 and 25.

## Implementation

1. A versioned JSON format: invoice number, version, issue and due dates, customer (name, email, ABN), lines (description, quantity, unit price, GST code, total in cents, GST-inclusive as the Admin Dashboard stores them), totals, status (issued, replaced, credit).
2. A Zod schema in `src/import/invoice-exchange.ts` (pure) and invented fixtures.
3. A matching spec is needed in the Admin Dashboard project. Write it as a short note for the author to place there; do not edit that project.

## Check When Done

- Fixtures validate. A malformed file gives an error naming the field.
