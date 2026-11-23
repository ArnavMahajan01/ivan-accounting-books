# 046: Sample Business Data Set

Spec: [046](../feature-specs/04-demo-2-the-sample-book/046-sample-dataset.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- `src/services/sample/` builds an invented business, **Harbour Lane Joinery Pty Ltd**, with a placeholder ABN (`18 123 456 789`, which passes the check digits), the default chart, two invented bank accounts (**Business One ··4821** and **Business Cash Reserve ··7730**, linked to accounts 1000 and 1010), 25 customers and suppliers, and every entry from 1 July of the financial year up to today.
  - `sample-data.ts`: the curated entries from 1 July to 23 November (sales with GST and one GST-free export sale, materials, fuel, subcontractors, rent, phone, power, insurance, software, tools, office supplies, the accountant, bank fees, three transfers between the two accounts, five owner drawings, an owner contribution, and the BAS payment for July to September), and a seeded continuation after 23 November, up to the end of the year.
  - `build-sample-books.ts`: posts everything through `postEntry`, stamping each entry with its own date, and makes two corrections through `changeEntry` so the history panel has something to show (Bunnings posted to Tools and small equipment and then moved to Materials and supplies, and Timberlink posted a day late and then corrected).
  - `sample-figures.ts`: the figures the books must produce on 23 November 2026.
- **The amounts were solved on paper** (a throwaway script, not kept) so that on 23 November 2026 the books show the figures in the signed-off wireframes: Business One $18,642.35, Business Cash Reserve $25,000.00 (bank balance $43,642.35, "2 accounts"), GST owing for October to December $3,184.20, profit for FY 2026–27 $42,453.50, materials $9,812.40 and fuel $1,046.30. The wireframes' own rows are in it too: Smith Renovations $4,950.00 (15/11/2026), Timberlink $2,140.00 (28/09/2026), Bunnings $342.15 (18/11/2026) and Ampol $96.40 (16/11/2026).
- **Two tables created early, because the sample books need them:** `contact` (migration `0007`) and `bank_account` (migration `0008`), with the columns specs 071 and 055 list. Spec 071 adds the words that match a bank line to a contact, and 055 adds renaming and deactivating. A line's `payee_id` is a contact's id, and `validateEntry` now refuses an unknown payee (`unknown-payee`), since the column has no foreign key.
- `src/domain/simple-entry.ts`: builds the entry for money moving through one account (GST worked out by the one GST helper, the GST line to the GST account). The sample books use it now, and posting a bank line (folder 06) will too.
- Services `addContact` and `addBankAccount`, each with an audit row. `ID_KINDS` gained `con` and `bnk`.

## Verified

- `npm run check` passes (732 tests at the end of folder 04). `src/services/sample/build-sample-books.test.ts` (26 tests) builds the books and checks:
  - **every figure in the figures list** (all 18 account balances, the bank balance, profit, GST owing, the BAS payment of $785.16, and the trial balance at $100,024.13 on each side), and that no other account has a balance;
  - **building twice gives identical books**, every row, id and timestamp (compared table by table);
  - the same entries up to any date, however far the books run, and balanced books and a clean books check on seven other days, including 1 July and the end of June;
  - every entry has a "Posted" row in its history, nothing was written outside the posting service, and the two corrections show their before and after.
- A new financial year starts from 1 July with the same shape. The BAS for each quarter is paid on the 28th of the month after it ends, only once that day has come.
- Building takes about 45 ms (94 entries).

## Notes

- **Where the spec said "Westpac Business One ··4821":** the accounts are named as in the wireframe, "Business One ··4821", with the bank, Westpac, held in the bank account record.
- After 23 November the books grow with seeded entries, so on a later day the figures drift from the wireframes. They match exactly on 23 November 2026, and a later day is still a believable, balanced year.
- The payee names are invented, apart from Bunnings, Timberlink and Ampol, which are the wireframes' own. The chart's account names follow the default template ("Materials and supplies"), not the wireframe's wording ("Materials & supplies").
- No lock date is set in the sample books. Locking is Demo 6, so no transaction shows "Locked" yet.
