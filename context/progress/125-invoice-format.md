# 125: Invoice Exchange File

Spec: [125](../feature-specs/10-demo-8-contacts-and-invoices/125-invoice-format.md)
Status: Done (built ahead of its gate; see Notes)
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- `src/import/invoice-exchange.ts` (pure): version 1 of the file, checked with Zod: issued invoices and credit notes (quotes counted and left out), number, version, status, issue and due dates, customer (name, email, ABN), lines (description, quantity as exact text, unit price, GST code, GST-inclusive total, GST), totals that must equal the lines, `creditFor` on a credit note, and an optional PDF file name. A wrong file gives the field and the problem, such as `documents.1.totals.totalCents: is not the lines added up`.
- Two invented fixtures in `tests/fixtures/invoices/`, with a loader like the Westpac one, described in `tests/fixtures/README.md`. INV-1061 and INV-1062 are paid by the deposits in the Demo 4 bank file, INV-1063 half paid by the Demo 5 one.
- `context/admin-dashboard-invoice-export.md`: the matching note for the author to place in the Admin Dashboard project.

## Verified

- `invoice-exchange.test.ts`: both fixtures read, the quote left out; a total one cent off and an impossible date each name their field; not JSON, another format and another version are refused. Lint passes (the pure `import` layer reads fixtures through the loader, not the file system).

## Notes

- **Gate:** `decisions/admin-dashboard-link.md` is still open and client question 24 unanswered. Built to the decision's own recommendation at the author's request to finish folder 10 unsupervised; the decision is left for the author to sign.
