# W05b: Wireframe: Transactions and Chart of Accounts

Wireframes for the Transactions list (with the account changed in the row) and the chart of accounts (type, usual GST, balance in the books, bank balance). Added on 2026-11-22 from the author's screenshots of the client's QuickBooks (`references/imagesforaccountant/`, structure only).

Part of the client review pack. It follows W05 and comes before the W10 meeting.

## Depends On

- W05

## Implementation

1. Make 5 black-and-white options in `wireframe/2211-transactions-and-accounts/` with the wireframe skill, Wireframes only.
2. Cover: filters; changing an account in the row; an entry's history; moving several at once; a ledger per account; cleaning up unused accounts.
3. Take only layout and structure from the author's QuickBooks screenshots. Every name, payee, number and amount is invented, matching W03 to W09.
4. Add it to `wireframe/index.html`, and a section to `context/wireframe-feedback.md`.

## Scope Limits

- Changing a posted entry always goes through the posting service and its history. Locked quarters cannot change.

## Builds Into

- Specs 050 to 052 (screens), 083 and 084 (fixing entries, managing accounts).

## Check When Done

- The wireframe opens from `wireframe/index.html` and every tab works.
- No name, number or amount from the screenshots appears in it.
- The author has clicked through all 5 options.
