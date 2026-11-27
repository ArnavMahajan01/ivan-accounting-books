# Test Fixtures

Invented data only. Every bank file, name, account number, amount and description in this folder is made up.

- Never copy a real Westpac export, a real QuickBooks file or a screenshot here, even with parts removed. Make a new file in the same format instead.
- `westpac/` holds the invented Westpac statement files (OFX). Its own README says what each file is for and how it relates to the sample books.
- `invoices/` holds invented invoice exchange files, as the Admin Dashboard would write them (spec 125). `…-2026-11-22.json`: INV-1061 and INV-1062, paid by the deposits in the Demo 4 bank file; INV-1063, half paid by the deposit in the Demo 5 file; INV-1064, overdue, for a customer the sample books do not have; and a quote, which is left out. `…-2026-11-25.json`: INV-1061 again (already in the books), INV-1064 version 2 (replaced), and a credit note for INV-1062.
- The invented business used everywhere is "Harbour Lane Joinery Pty Ltd".
- Real files for a private check go in `tests/private/`, which git ignores, and never into a test that runs in `npm test`.

Rules: `CLAUDE.md` hard rule 3, `context/security-context.md`.
