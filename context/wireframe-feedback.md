# Wireframe Feedback

What the client chooses in the wireframe review (spec W10), screen by screen. The author fills this in during or after the meeting. W11 turns it into the sign-off and the Screens section of `ui-context.md`.

**Rules:**

- Every row says who said it and the date: "client, 2026-12-03".
- Write what he wants, not how to build it.
- No real figures, names or account numbers. If he points at a real number, write the kind of thing ("his largest supplier").
- A screen he does not like gets a new W spec to redo it (`W03a`, ...), listed in `feature-specs/README.md`. Earlier specs are not changed.

The wireframes are in `wireframe/`. Open `wireframe/index.html`. Each screen was built on 2026-11-21 with 5 black-and-white options (wireframes only, no colour).

## Questions To Ask In The Meeting

Taken from `client-questions.md`. Record each answer there as well, and change its status.

- **1.** Which QuickBooks screens does he use every week or month? (Decides whether W08, invoices and bills, is needed.)
- **3.** Cash or accrual GST? (The BAS worksheet and Settings show cash.)
- **5.** Monthly or quarterly BAS, and who lodges it?
- **6.** Which reports does the accountant need, and how often?
- **7.** What may the accountant change in a shared sheet? (The wireframes assume the Account, GST and Note columns, accepted one by one.)
- **18.** Should a rule be saved automatically, or only when he ticks "suggest this next time"?
- **19.** Does he split one bank line across several accounts?
- **20.** Should a locked quarter ever be unlockable?
- **21.** Does he share with anyone besides his accountant?
- **22.** Which calculations does he do today? (Decides the Ready formulas list.)
- **23.** One workbook or separate sheets? (Ask the accountant.)
- **24.** Does he keep making invoices and quotes in the Admin Dashboard?
- **25.** Should a payment matched here mark the invoice paid in the Admin Dashboard too?
- **26.** Save new customers and suppliers straight away, or ask first?

## 1. App Shell And Home

`wireframe/2111-app-shell-and-home/`

**Options:** 1 Safe (four summary cards, recent imports, next BAS). 2 Next Steps (a to-do list with the numbers beside it). 3 Quarter Timeline (the year as BAS quarters, with steps to this quarter's BAS). 4 Command Bar (search and jump first). 5 Activity Feed (money on the left, a dated log on the right).
**Recommended:** Option 2, Next Steps.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 2, Next Steps (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 2. Bank Page And Import Preview

`wireframe/2111-bank-import/`

**Options:** 1 Safe Sheet (counts, balance check and lines in a sheet). 2 Step Flow (choose, check, done). 3 Full Page (a filterable full-page table). 4 Inline Row (drop a file on its account row). 5 Plain Summary (the sheet written as sentences, table one click away).
**Recommended:** Option 5, Plain Summary.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 5, Plain Summary (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 3. To Review

`wireframe/2111-to-review/`

**Options:** 1 Review Table (spreadsheet table, keyboard first, accept many). 2 One at a Time (one big line per screen). 3 Grouped (lines grouped by suggested account). 4 Split View (list and full editor). 5 Confidence Lanes (columns for rule, guess and needs you).
**Recommended:** Option 1, Review Table, with Option 3's "Accept all suggested" button.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 1, Review Table, with Option 3's "Accept all suggested" button (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 3a. Bank Rules

`wireframe/2211-bank-rules/`

**Options:** 1 List and Edit Panel. 2 Rule From a Line. 3 Plain Sentences. 4 Suggested Rules. 5 Rules Per Account.
**Recommended:** Option 1, with Option 2's "Do this every time?".

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 1, with Option 2's "Do this every time?" (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 3b. Transactions And Chart Of Accounts

`wireframe/2211-transactions-and-accounts/`

**Options:** 1 Tables. 2 With History Panel. 3 Fix Many At Once. 4 Ledger By Account. 5 Clean Up Accounts.
**Recommended:** Option 1, with Option 2's history panel and Option 3's "Move to".

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 1, with Option 2's history panel and Option 3's "Move to" (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 3c. Invoices From The Admin Dashboard

`wireframe/2211-invoices-from-admin-dashboard/`

**Options:** 1 Import a File. 2 Linked Folder. 3 Customers and Balances. 4 Match the Payment. 5 One App Later.
**Recommended:** Option 2, with Options 3 and 4.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 2, with Options 3 and 4 (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 3d. Contacts

`wireframe/2211-contacts/`

**Options:** 1 List and Contact Page. 2 Saved As You Go. 3 Side Panel Anywhere. 4 Contact Timeline. 5 Tidy Duplicates.
**Recommended:** Option 1, with Option 2's saving as you go, Option 3's side panel, and Option 5's merging.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 1, with Option 2's saving as you go, Option 3's side panel, and Option 5's merging (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 4. Reports And BAS Worksheet

`wireframe/2111-reports-and-bas/`

**Options:** 1 Safe (list, then a page per report). 2 Report Hub (reports list inside the page). 3 Quarter Close (a checklist leading to the BAS and the lock). 4 Expand Rows (figures open in place). 5 Compare Periods (periods and quarters side by side).
**Recommended:** Option 3, Quarter Close.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 3, Quarter Close (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 5. Sharing With The Accountant

`wireframe/2111-sharing-with-accountant/`

**Options:** 1 Safe Tables (a sheets table and a changes table). 2 People First (access grouped by person). 3 Sheet Cards (a Drive-like card per sheet). 4 Change Diff (each change with its effect on the books). 5 Inbox (one page, changes on top).
**Recommended:** Option 2, People First, with Option 4's "What accepting does" box.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 2, People First, with Option 4's "What accepting does" box (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 6. Settings

`wireframe/2111-settings/`

**Options:** 1 Sections (one page, a section per area). 2 Preference Tabs (Mac-style tabs). 3 Status Cards (a card per area, problems first). 4 Plain Sentences (each setting as a sentence). 5 Search List (one searchable list).
**Recommended:** Option 3, Status Cards.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 3, Status Cards (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 6a. Customise A Report

`wireframe/2211-customise-a-report/`

**Options:** 1 Customise Sheet. 2 Side Panel (live). 3 Add Column Button. 4 My Reports (saved layouts). 5 Ready Layouts.
**Recommended:** Option 2, Side Panel, starting from Option 5's layouts and saving into Option 4's list.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 2, Side Panel, starting from Option 5's layouts and saving into Option 4's list (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 6b. Working With The Google Sheet

`wireframe/2211-working-with-the-google-sheet/`

**Options:** 1 Side By Side (Chrome). 2 Sheet Inside The App (optional panel). 3 Preview Before Publish. 4 Ready Formulas. 5 Workbook Map.
**Recommended:** All together, built around Option 3. Explain the in-app panel's limits to him in person.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| All together, built around Option 3. Explain the in-app panel's limits to him in person (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 6c. Help And Guides

`wireframe/2211-help-and-guides/`

**Options:** 1 Like Admin Dashboard. 2 Help On Each Page. 3 Keep On Screen. 4 Getting Started Path. 5 Guide Cards.
**Recommended:** Option 1, with Option 2's help button on each page.

| Option he picks | Changes he wants | What he does not want | Who and when |
|---|---|---|---|
| Option 1, with Option 2's help button on each page (the recommended option) | None reported | None reported | Client, signed off 2026-11-22, reported by the author |

## 7. Invoices And Bills

Not drawn. Waits for client question 1 (spec W08).

## Anything Else He Said

Nothing else was reported with the sign-off on 2026-11-22. The meeting questions above are still open in `client-questions.md` unless marked there.


| What he said | Screen | Who and when |
|---|---|---|
| | | |
