# 129: Match a Deposit to Invoices

In To review, a deposit is matched to the invoice it pays, or split across several (W08a, Option 4).

**Client sees:** "Match INV-1042", and "Split across invoices…".

## Depends On

- 128

## Implementation

1. Suggestions by amount and invoice number in the description.
2. Match posts the payment against accounts receivable. A split shares a deposit across invoices, leaving part payments owing. Leftover can go to an account.

## Check When Done

- Tests: full, part, several invoices, overpayment. The trial balance balances.
