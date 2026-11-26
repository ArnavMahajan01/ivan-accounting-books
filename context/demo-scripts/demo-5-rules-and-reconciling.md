# Demo 5: Rules, Fixing Entries and Reconciling (spec 088)

A script for the author. About 15 minutes. It shows the client that the app does the repetitive work (rules), that a mistake is easy to fix (with its history), and that his books agree with the bank (reconciling). Every file used is invented, in `tests/fixtures/westpac/`, and the books are the invented business Harbour Lane Joinery. Nothing is real.

## Before the meeting

1. Run the packaged app (`npm run package`, then open `release/mac-arm64/Accounting Books.app`).
2. Start from fresh sample books: Settings, the **Developer** card, **Clear sample data**, then **Load sample data**.
3. Put these files from `tests/fixtures/westpac/` on the Desktop:
   - `business-one-2-13-nov-2026.ofx`
   - `business-one-9-20-nov-2026.ofx`
   - `business-one-21-23-nov-2026-demo-4.ofx`
   - `business-one-24-26-nov-2026-demo-5.ofx`
4. Import the first three from the Bank page, then in **To review** click **Post all suggested** until only lines with no suggestion are left. (The first two files match entries already in the books. Demo 4 showed this.)

## The walk

1. **His rules.** Open **Rules** (Command-7). Three sample rules, in order: Timberlink is always materials; Westpac account fee; Phone and internet, split 70% and 30%. "Like your QuickBooks Rules page. They are tried in order, and the first that fits wins." Point at the arrows and at **On**.
2. **A rule at work.** Open **To review**. The Westpac fee line says **from your rule** under Bank fees. "You never pick that account again."
3. **A rule from a line.** Post a TOTAL TOOLS MASCOT line to 6110 Tools, then the second one the same way. The message asks: **Do this every time for "TOTAL"?** Click **New rule from this line**: the Rules page opens with the rule filled in. Change the words to "TOTAL TOOLS", tick **Post matching lines by themselves**, and click **Test**: "matches 1 line in To review and 2 posted lines". **Save**. (Client question 18: should the app offer this, or make the rule by itself?)
4. **Rules that post by themselves.** On the Rules page, **Edit** Timberlink, tick **Post matching lines by themselves**, **Save**. Make one more: **New rule**, name "Bunnings", Description contains BUNNINGS, account 5000 Materials and supplies, GST, ticked to post by itself. **Save**.
5. **Import and watch.** From the Bank page import `business-one-24-26-nov-2026-demo-5.ofx`. The sheet says **3 lines were posted by your rules**, with **Undo**. Open To review: of the new file, only the deposit and the fee wait. "The everyday ones are done before you look."
6. **Fix a mistake, with its history.** Open **Transactions** (Command-4). On a line, click **Change** under its account and choose another, such as 6060 Office supplies. "The GST is worked out again." Click the row: the panel's **History** says what changed and when. Then **Select**, tick two, **Move 2 to…** an account, **Move**.
7. **Accounts.** Open **Accounts** (Command-5). **New account**: "Workshop consumables", 6200, Expense, usual GST. **Edit** it: rename it, then **Stop using this account**, which says what happens to its transactions.
8. **Reconcile.** Open **Bank**, click **Reconcile** beside Business One. Choose the statement of 20/11/2026 ($18,642.35): "Your books agree with the statement". **Finish**. The Bank page says **to 20/11/2026**. Then try 26/11/2026 with the Demo 5 file's balance ($22,373.35): the difference is explained by the lines still waiting, listed, with a link to post them.
9. **Help** (Command-?). **Make a bank rule**, **Fix a posted transaction**, **Reconcile an account**.

## What to ask him

- **Question 18:** should a rule be made by itself after he posts the same thing a few times, or only when he says yes (as now)?
- Which of his QuickBooks rules post by themselves today? Should any of them not?
- Does he reconcile every month, or only at the BAS? Against a paper statement, a PDF, or the file?
- Is "Change" in Transactions where he would look to fix an account?

## Things that look unfinished, on purpose

- Home does not yet say how many lines rules posted at the last import: the import sheet does.
- A rule can name one bank account or all of them, not a chosen few.
- Undo after a reconciliation is refused for the lines it covered; changing their account in Transactions still works.
- Reports, the BAS and locking a quarter are Demo 6.

Write his answers in `demo-feedback.md`, under "Demo 5", with the date, and question 18's answer in `client-questions.md`.
