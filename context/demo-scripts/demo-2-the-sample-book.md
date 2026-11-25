# Demo 2: The Sample Book (spec 054)

A script for the author. About 10 minutes. It shows the client the app with numbers in it, using the invented business Harbour Lane Joinery. Nothing in it is real.

## Before the meeting

1. Run the packaged app (`npm run package`, then open `release/mac-arm64/Accounting Books.app`, right-click and Open the first time).
2. On the first launch, click **Start with sample data**. Or, on a Mac that has already been used, open Settings, and in the **Developer** card click **Clear sample data** and then **Load sample data**, so the books are fresh.
3. Check that "Sample data" shows beside every page title.

The figures below are what the books show on **23 November 2026**, the day they were made to match the signed-off wireframes. On a later day the books run a little further, so the numbers move a little. Do not read them out; read them off the screen.

## The walk

1. **Home** (Command-1). "This is the first page you see." Point at the four numbers:
   - Bank balance $43,642.35 across 2 accounts.
   - Lines to review 0. "This fills when you bring in a bank file. That is the next demo."
   - GST owing for the quarter, $3,184.20.
   - Profit for the financial year, $42,453.50.
   Say the To do box has one job, "Bank lines reviewed", ticked, because no bank line has been brought in yet.
2. Click **GST owing**. It opens **Accounts**. "The same figure is here, as the GST account, with a minus sign because it is money you owe."
3. **Accounts.** Show the groups: bank accounts first, then assets, liabilities, income and expenses. Type `motor` in the search box. Press Enter on **Motor vehicle expenses**.
4. **Transactions** opens with only that account. Click **Clear filters**.
5. Choose **Money in** in the first box, then **All transactions** again. Type `342.15` in the search box: one transaction, from Bunnings.
6. Click the Bunnings row. The panel shows the date, the amounts, **What it did to the books** (debits equal credits) and **History**: Posted, then Changed ("Account changed from Tools and small equipment to Materials and supplies"). "Every correction is kept." Press Escape.
7. **Help** (Command-?). Open **Reading your books**. "This is the guide for what you just saw."
8. Say what is coming: importing a Westpac file (Demo 3), then sorting bank lines into accounts (Demo 4).

## What to ask him

From the spec (054):

- Are these the numbers you look at first when you open QuickBooks? Anything missing from Home?

Also worth asking (recorded as client questions 29 and 30):

- Credit balances show with a minus sign, as in the wireframe, so Sales shows as a minus figure. Would you rather income and what you owe show as plain positive numbers?
- Which one thing in QuickBooks do you open every week, that you have not yet seen here?

Write his answers in `demo-feedback.md`, under "Demo 2", with the date. Each change he wants becomes a new spec with a letter suffix.

## Things that look unfinished, on purpose

- **Import file** is greyed out. It works from Demo 3.
- **To review, Bank, Reports, Shared sheets and Accountant changes** say "Coming in a later version."
- Settings shows most cards as "Coming in a later version." The **Developer** card is for you, and is removed in the build that goes to the client.
- No transaction shows "Locked" yet: locking a BAS period is Demo 6.
