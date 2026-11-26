# Demo 4: Categorising (spec 077)

A script for the author. About 15 minutes. It shows the client his main job in the app: giving each bank line an account and posting it, as in his QuickBooks "For review" tab. Every file used is invented, in `tests/fixtures/westpac/`, and the books are the invented business Harbour Lane Joinery. Nothing is real.

## Before the meeting

1. Run the packaged app (`npm run package`, then open `release/mac-arm64/Accounting Books.app`).
2. Start from fresh sample books: open Settings, and in the **Developer** card click **Clear sample data**, then **Load sample data**.
3. Put these four files from `tests/fixtures/westpac/` somewhere easy, such as the Desktop:
   - `business-one-2-13-nov-2026.ofx`
   - `business-one-9-20-nov-2026.ofx`
   - `business-one-21-23-nov-2026-demo-4.ofx`
   - `cash-reserve-21-23-nov-2026-demo-4.ofx`
4. Do not import `business-one-16-23-nov-2026-bad-date.ofx` this time: its lines overlap the Demo 4 file, and Business One's closing balance would then show a difference.
5. Check that "Sample data" shows beside every page title.

If Demo 3 is held in the same meeting, run its walk first, then start here from fresh sample books.

## The walk

1. **Lines already in the books: Match.** Import `business-one-2-13-nov-2026.ofx` from the Bank page, then open **To review** (Command-2). Every line says **Match**, and "same amount in your books". "The sample books already hold these movements. Match links the bank line with what is there, so nothing is counted twice." Click **Post all suggested (11)**. "11 posted." Point at the count beside To review going to 0, and at **Undo** in the message.
2. Import `business-one-9-20-nov-2026.ofx`, open To review, and **Post all suggested (7)** again. "Every bank line is now linked with an entry in your books."
3. **New lines.** Import `business-one-21-23-nov-2026-demo-4.ofx` and `cash-reserve-21-23-nov-2026-demo-4.ofx`. Open To review: 13 lines. "These are new: nothing in your books yet." Point at the columns: date, the bank's description with **From/To** under it, **Spent** and **Received** apart, then **Match or account** with the GST code under it, and **Post**. "The same as your QuickBooks For review tab."
4. **Suggestions.** Point at BUNNINGS, AMPOL and SKYLINK: the account and GST code are filled in, with "same as last time" underneath. "You posted lines like these before, so the app fills them in the same way. It never posts them without you."
5. **Post 10 lines fast with the keyboard.** Click the first row, then: press **Return** to post it; the row leaves and the next is ready. For a line with no suggestion, just type: "6010" (or "bank fees"), then **Return**. Show the keys along the bottom.
6. **A payee filled in.** On the first TOTAL TOOLS MASCOT line, type "Total Tools" in **From/To** and press Return. "Saved Total Tools as a supplier. 2 more lines now show it." Point at the other two Total Tools lines. Then type "6110" in its account box and press Return. The other two now say "same as last time". (Client question 26: should it save straight away like this, or ask first?)
7. **Post a group.** Tick three lines (click the boxes, or **Space** on each). The button says **Post 3 selected**. Press **Command-Return**. Then try ticking one line with no account: "1 needs an account." "One bad line never stops the rest."
8. **Split Officeworks.** Select OFFICEWORKS 0412 and press **S** (or click **Split…**). Type Office supplies, $86.45, then Tools and small equipment, $150.00. Point at **Left to split $0.00 ✓**. "It only saves when it adds up to the line." **Save split**. (Client question 19: how often does he split a line?)
9. **Pair a transfer.** TRANSFER TO CASH RESERVE 7730 says **Pair**. Click **Transfer to Business Cash Reserve…**: "Matches a line in Business Cash Reserve on 23/11/2026. Both lines will be marked as this transfer." **Save transfer**. "2 posted": both accounts' lines leave together. "A transfer is not income or an expense, and has no GST."
10. **Undo a slip.** Post a line to the wrong account on purpose (type "Sales" on a purchase), then press **Command-Z**, or click **Undo**. "Undone. 1 line is back in To review." "Any post, or a whole batch, can be taken back straight away."
11. **What it did.** Open **Transactions** (Command-4): the posted lines are there, with their GST. Open **Home**: the bank balance, GST owing and profit have moved.
12. **Help** (Command-?). Under **To review**: **Review and post bank lines**, **Split a line across accounts**, **Mark a transfer between your accounts**.

## What to ask him

From the spec (077) and the open client questions:

- **Question 18:** when he gives a line an account, should the app make a rule for that description by itself, or only when he ticks "do this every time"? (Rules are Demo 5. Today the app suggests from past lines, and never posts without him.)
- **Question 19:** does he split one bank line across several accounts, and how often?
- **Question 26:** should a new From/To be saved as soon as he types it (as now, with Undo), or should the app ask first?
- **Matching:** is "Match" the right word for a line that is already in the books? In his own books this will happen when the accountant or an invoice has put an entry in first.
- Is anything in the row too small, or missing, compared with QuickBooks? Does he want the bank account's name on each row?

## Things that look unfinished, on purpose

- **Rules** (and "Do this every time?") are Demo 5. Suggestions here come only from lines he posted or matched before.
- **Match** finds entries already in the books. Matching a deposit to an invoice is Demo 8.
- A posted line cannot yet be changed from Transactions: undo it straight away, or wait for "Fix a posted line" in Demo 5.
- To review shows the oldest 200 lines at a time. Posting them brings up the rest.

Write his answers in `demo-feedback.md`, under "Demo 4", with the date, and the answers to questions 18, 19 and 26 in `client-questions.md`. Each change he wants becomes a new spec with a letter suffix.
