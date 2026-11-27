# 129: Match a Deposit to Invoices

Spec: [129](../feature-specs/10-demo-8-contacts-and-invoices/129-match-payment.md)
Status: Done
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- Migration `0017-invoice-payments.sql`: `invoice_payment` (id `ipy_`, invoice number, the entry that paid it, amount, date paid). `src/data/invoice-payment-repository.ts` lists, adds and removes them.
- `src/services/invoice-payments.ts`:
  - `suggestInvoices`: an invoice still owing whose number's digits are in the bank description ("INV 1061"), or else one owing exactly the deposit.
  - `matchDeposit`: posts the deposit through the posting service as a split (accounts receivable for the invoices, and any leftover to the account he picks), then records each payment with an `invoice.payment` audit row, in one transaction. Refuses more than is owed on an invoice, and parts that do not add up to the deposit.
  - `paymentBasLines`: on the cash basis, a payment brings in its share of the invoice's sales and GST in the quarter it was paid, net of credit notes, rounded so the shares add up to the invoice exactly.
- Undo (`undo-post.ts`) removes the payments with the entry, so the invoice is owed again.
- To review: a deposit with a suggestion shows "Invoice · INV-1061 · Harbourview Developments", why ("its number is in the description" or "it is the amount owed"), a **Match** button, "Split across invoices…" (the sheet `InvoiceSplitSheet.tsx`: owing, paying now, left to split, leftover to an account) and "Choose an account instead".
- The Invoices page shows a matched invoice as "Paid 22/11/2026" and counts it in "Paid, last 30 days".

## Verified

- `invoice-payments.test.ts` (7): suggestion by number and by amount; full payment marks it paid and the books balance; part payment leaves the rest owing; one deposit across two invoices with an overpayment to an account, books balance; more than owed and not adding up are refused; undo; the invoice's $380.00 GST moves into the quarter it was paid.
- `match.test.tsx` (2): the row's Match posts the suggested invoice; the split sheet saves parts and leftover.
- `npm run check`: 1,262 tests pass.
- In the built app (Playwright driving it, screenshots looked at): imported the Demo 4 OFX and the invoice fixture, To review showed the HARBOURVIEW deposit as INV-1061 with Match; Match posted it, To review went from 12 to 11, and Invoices showed INV-1061 "Paid 22/11/2026" and "Paid, last 30 days $4,180.00 1 payment". The split sheet for the ELLIS deposit showed the three owing invoices and "Left to split: $0.00".

**Not checked:** dark theme of the split sheet (the folder's Impeccable pass before Demo 8). A payment for an invoice dated in a locked quarter is refused by the posting service like any other post into a locked period, not separately tested here.
