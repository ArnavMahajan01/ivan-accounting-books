# Demo 6: Reports and the BAS (spec 104)

A script for the author. About 15 minutes. It shows the client his reports, the lines behind any figure, the BAS worksheet, closing and locking a quarter, exporting, and a report of his own. The books are the invented business Harbour Lane Joinery. Nothing is real.

## Before the meeting

1. Run the packaged app (`npm run package`, then open `release/mac-arm64/Accounting Books.app`).
2. Start from fresh sample books: Settings, the **Developer** card, **Clear sample data**, then **Load sample data**. (Locking in step 6 cannot be undone, so the demo must run on fresh sample books, never his own.)
3. Have an empty folder on the Desktop for the exported files.

The figures move a little from day to day, because the sample books run on to today. The July to September BAS does not move: GST to pay is $785.16.

## The walk

1. **Reports** (Command-6). "Like your QuickBooks Reports: profit and loss, balance sheet, trial balance, and the BAS worksheet." Point at **Close the last quarter**.
2. **Profit and loss.** It opens on this quarter. Change the period to **This financial year**. "Income, expenses, and net profit at the bottom."
3. **Click a figure.** Click Materials and supplies. The lines that make it up open, with their total, which is always the figure. **Open in Transactions** goes to them.
4. **Balance sheet** and **Trial balance** (Back to Reports). Point at the sentence under each: "Assets equal liabilities plus equity." "Balanced: debits equal credits."
5. **BAS worksheet.** It opens on last quarter, July to September. G1, 1A, 1B, and **GST to pay (1A less 1B) $785.16**. Click 1B: every purchase in it. Read the note: "The app does not lodge anything with the ATO." (Client question 5: monthly or quarterly, and who lodges?)
6. **Close the quarter.** Reports, **Close the last quarter**: four steps, each saying whether it is done. Bank lines are reviewed; the accounts are not reconciled, so reconcile Business One to 30/09/2026 from the Bank page if you want the tick, or say "you would reconcile first". Click **Lock Jul–Sep 2026…**: the question says what will be locked, and Lock stays grey until **The BAS for this quarter is done** is ticked. Lock it. Open Transactions: July to September now says **Locked**. (Client question 20: should a locked quarter ever be unlockable?)
7. **Export.** Open the profit and loss, **Export PDF**, save it to the Desktop folder, and open it: the business name, the period, page numbers. **Export CSV**, and open it in Numbers: plain numbers that add up.
8. **His own report.** On the profit and loss, **Customise**: tick **Last period** and **% of income**; the report changes straight away. **New column…**: name it "Change", pick **Difference between two columns**, see the preview, **Add column**. **Save as my report**: "Quarterly P&L for accountant". Back on Reports it is under **My reports**; open it: the same columns.
9. **Help** (Command-?). **Read your profit and loss**, **Check the BAS worksheet**, **Close and lock a quarter**, **Make your own report**.

## What to ask him

- **Question 3:** is the business on the cash or the accrual basis for GST? (The app assumes cash.)
- **Question 5:** does he do the BAS monthly or quarterly, and does he or the accountant lodge it?
- **Question 20:** after a quarter is locked, should it ever be unlocked, for example to fix something the accountant finds? (Now: never; a correction goes in the next quarter.)
- Which reports does his accountant ask for, and in what layout? (Question 6.)
- Is "Group small expenses as Other" useful, and what is small to him? (Now: under 2% of income.)

## Things that look unfinished, on purpose

- **Publish to Google Sheets** is greyed: it comes in Demo 7.
- Customise and My reports work on the profit and loss; the balance sheet, trial balance and BAS have their period only.
- The BAS is the simpler BAS. On the accrual basis it counts the same lines until invoices and bills arrive (Demo 8).
- The trial balance is as at the period's end, from the start of the books.

Write his answers in `demo-feedback.md`, under "Demo 6", with the date, and questions 3, 5 and 20 in `client-questions.md`.
