# Demo 3: Importing a Westpac File (spec 067)

A script for the author. About 10 minutes. It shows the client the first real job: bringing bank lines in. Every file used is invented, in `tests/fixtures/westpac/`, and the books are the invented business Harbour Lane Joinery. Nothing is real.

## Before the meeting

1. Run the packaged app (`npm run package`, then open `release/mac-arm64/Accounting Books.app`).
2. Start from fresh sample books: on a Mac that has been used, open Settings, and in the **Developer** card click **Clear sample data**, then **Load sample data**. A fresh sample has no imported lines, so the walk below reads true. (Clearing deletes only the sample, never his own books.)
3. Put these four files from `tests/fixtures/westpac/` somewhere easy, such as the Desktop:
   - `business-one-2-13-nov-2026.ofx`
   - `business-one-9-20-nov-2026.ofx`
   - `business-one-16-23-nov-2026-bad-date.ofx`
   - `other-account-16-nov-2026.ofx`
4. Check that "Sample data" shows beside every page title.

The figures below are read off the screen. The **In your books** balance moves a little from day to day, because the sample books run on to today. The files and what the sheet says about them do not move.

## The walk

1. **Bank** (Command-3). "These are your Westpac accounts. Nothing has been brought in yet." Point at **None imported yet**, and at the line under the table, with its link to the guide.
2. **Import file.** Choose `business-one-2-13-nov-2026.ofx`. Read the sheet slowly, as sentences:
   - "This file is for Business One ··4821, from 02/11/2026 to 13/11/2026."
   - "11 new lines will go to To review."
   - "First file for this account." "Nothing to check it against yet, so it just says so. Later files are checked against it."
   Click **See all lines**: the table, closed until asked for. Then **Import 11 lines**. It says "11 lines added to To review". Point at the **11** that appeared beside To review in the sidebar. Click **Done**.
3. **The same file again.** Click **Import file** and choose the same file. "Nothing is new. 11 lines are already in your books." Only **Close**. "You cannot double anything by mistake."
4. **Drag a file in.** Drag `business-one-9-20-nov-2026.ofx` from the Desktop onto the window, from any page. The Bank page opens with the sheet:
   - "7 new lines will go to To review."
   - "6 lines are already in your books from an earlier import. They will be skipped."
   - A tick: "Closing balance matches."
   "This file covers some of the same days as the last one. Only the new days are added." Click **Import 7 lines**. The count is now 18.
5. **A file with a problem.** Choose `business-one-16-23-nov-2026-bad-date.ofx`. Read:
   - "1 line could not be read: line 81 has the date "31/11/2026", which is not a real date. It will not be imported."
   - A mark, not a tick: "Closing balance does not match. ... The difference, $100.00, is the line that could not be read."
   Click **See all lines**, and use **Show** to pick **Could not be read**. "It tells you which line and why, and it does not stop you importing the rest." Click **Import 3 lines**.
6. **Taking an import back.** Under the accounts table, **Last import** names the file just brought in. Click **Undo import**. The question says how many lines will leave To review, and that the file can be imported again. Click **Undo import**: the count goes down. "If you chose the wrong file, it is not a mistake you live with." (Only the file imported last can be taken back, and only while none of its lines has been dealt with.) Import it again if the walk goes on.
7. **The wrong account.** Choose `other-account-16-nov-2026.ofx`. "This file is for an account ending 9999, which is not one of your bank accounts." "It will not put another account's lines into yours." Click **Close**.
8. **To review.** Open it. It says how many lines are waiting. "Choosing an account for each line is the next demo."
9. **Help** (Command-?). Open **Bring in a Westpac statement**. "This is how to download the file from Westpac, and these steps."

## What to ask him

From the spec (067) and the open client questions:

- **Question 16:** could he download one Westpac CSV and one OFX file, and send the header row of the CSV only, with no transactions? Until then only OFX works. (**Import file** offers OFX files only.)
- **Question 31:** when he exports OFX from Westpac Online Banking, does it ask for a date format? Could he send the first 30 lines of one OFX file with every description and amount replaced by `XXXX`?
- **Question 32:** does each line in his file have a number of its own, and does a statement ever list the same line on two files?
- Is the wording of the sheet clear to him? Is there anything he would want to see before pressing Import?
- How many accounts does he download, and how often? (Question 4.)

## Optional: his own file (not possible yet)

The spec allows this only if the author and the client agree: he imports one of his own Westpac files, on his own Mac, into a trial book that is deleted afterwards.

**It cannot be done yet.** The app has no screen for adding his bank account: that is the Bank accounts card in Settings (spec 133, Demo 9). In empty books the file would be turned away as "not one of your bank accounts", because the books know none. The client's own accounts and business are set up at go-live (folder 12). Until then, tell him this, and take the answers to questions 16, 31 and 32 instead. If the author wants to try a real file earlier, that is a change to the plan, so ask first.

## Things that look unfinished, on purpose

- Imported lines wait in **To review**, and stay there. Choosing an account and posting them is Demo 4.
- **Reconciled** says "Not yet". It is Demo 5.
- The sample books' bank movements are already in the ledger as posted entries, so the imported lines repeat some of them. In his own books they will not, because his lines come from his bank files.
- No Westpac CSV file can be imported yet.

Write his answers in `demo-feedback.md`, under "Demo 3", with the date. Each change he wants becomes a new spec with a letter suffix.
