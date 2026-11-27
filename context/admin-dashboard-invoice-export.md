# For the Admin Dashboard project: write issued invoices for Accounting Books

A note for the author to turn into a spec in the Admin Dashboard project (spec 125 of Accounting Books). Accounting Books does not edit that project.

## What to add

When an invoice or credit note is issued, or a new version replaces one, write a JSON file to the folder the client chose in its settings (Accounting Books reads the same folder, spec 127). One file may hold one or many documents. Quotes may be included; Accounting Books leaves them out.

## The format, version 1

```json
{
  "format": "accounting-books-invoices",
  "version": 1,
  "exportedAt": "2026-11-22T09:00:00+11:00",
  "documents": [
    {
      "kind": "invoice",
      "number": "INV-1061",
      "version": 1,
      "status": "issued",
      "issueDate": "2026-11-08",
      "dueDate": "2026-11-22",
      "customer": { "name": "Harbourview Developments", "email": "accounts@harbourview.example.com", "abn": null },
      "lines": [
        {
          "description": "Kitchen island and pantry",
          "quantity": "1",
          "unitPriceCents": 418000,
          "gstCode": "GST",
          "totalCents": 418000,
          "gstCents": 38000
        }
      ],
      "totals": { "totalCents": 418000, "gstCents": 38000 },
      "creditFor": null,
      "pdf": "INV-1061.pdf"
    }
  ]
}
```

- `kind`: `invoice`, `credit-note` or `quote`. A credit note names the invoice it is for in `creditFor`.
- `version`: 1, then 2 and up for each new version of the same number; `status` is `replaced` on an older version the file still carries.
- Dates are `YYYY-MM-DD`. Amounts are whole cents, GST-inclusive, as the Admin Dashboard already stores them, and the totals must equal the lines added up.
- `gstCode`: `GST`, `FRE` (GST-free) or `N-T` (not reportable).
- `abn`: 11 digits or null. `pdf`: the PDF's file name in the same folder, or null.
- Accounting Books keeps the GST the Admin Dashboard worked out, and never changes the file.

The full schema is `src/import/invoice-exchange.ts` in Accounting Books, with invented examples in `tests/fixtures/invoices/`.
