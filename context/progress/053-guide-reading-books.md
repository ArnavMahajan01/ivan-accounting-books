# 053: Guide: Reading Your Books

Spec: [053](../feature-specs/04-demo-2-the-sample-book/053-guide-reading-books.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- `guides/reading-your-books.json`: five sections (Home, Accounts, Transactions, a transaction in detail, and if something goes wrong), written to `guide-writing-rules.md`, with **four images** taken from the real app showing the sample data (`guides/images/`, 46 to 97 KB each, each with a description). `GUIDE_GROUPS` gained "Your books".
- `guides/getting-started.json` was updated to match the app as it now is: it describes Home, Accounts and Transactions as working, points to the new guide, and says what "Sample data" means.

## Verified

- `npm run check` passes: the guide validates, its file name matches its id, every image exists and is under 300 KB (`tools/guide-problems.test.ts`).
- **Every step was followed in the real app, one by one, by a script, and all 23 checks passed**: Command-1 opens Home; the four numbers; GST owing opens Accounts; the groups; the search by name and by code; the minus sign on GST; the inactive box being absent when there are none; the Transactions link and Enter on a row; the four kinds and the date choices (including "Choose dates…"); Transfers shows 3; the search for 342.15 finds one entry; the totals under the list; Next absent when 94 match; the panel's sections; debits equal to credits; Escape and Close; and the guide's four images, all loaded in the Help reader.
- Searching Help finds it by a word in its steps (`help.test.tsx`).

## Notes

- Not done: a read of the guide by the client for plain wording (check 3 in `guide-writing-rules.md`).
- The images show the figures of 23 November 2026. When the sample books or a screen changes, they need retaking (a follow-up in the tracker).
