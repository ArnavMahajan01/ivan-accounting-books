# Accounting Books

Working title, taken from the project folder name on 2026-11-21. The real name is client question 15.

The first version covers one client only. A scale version for other independent clients is planned but not scheduled (future idea F02).

## Overview

A private accounting app for the Mac, for one Australian small business owner who is leaving QuickBooks Online. He pays about AUD 90 a month for it now and uses many of its features (reported by the author on 2026-11-21). He keeps his books in the app, on his own Mac. He brings in his Westpac transactions by downloading statement files from Westpac Online Banking and dropping them into the app. The app sorts them into accounts, tracks GST, and produces his reports and BAS worksheet.

What makes it different from QuickBooks: his books never live on someone else's server, and his accountant never needs a login to anything. The client picks which reports to publish to Google Sheets in his own Google Workspace, and shares each file with his accountant as a viewer, commenter or editor. The accountant works in Google Sheets only.

The idea the design rests on: **the app's local file is the truth, and Google Sheets are copies.** An accountant's edit in a sheet is a suggestion that comes back to the app, where the client accepts or rejects it.

## Goals

1. The books always balance, and every amount, GST figure and report total can be traced back to the bank lines and entries behind it.
2. The client can do his regular bookkeeping in the app without opening QuickBooks: import, categorise, reconcile, report.
3. The client can publish a report to Google Sheets and share it with his accountant at a chosen access level, in a few clicks, without the accountant touching the app.
4. The client's data stays on his Mac, and survives a lost or broken Mac through backups he can restore.
5. The code is ready for a scale version later, without any scale feature appearing in the client's app now.

## Hard Constraints

1. **Desktop, not web.** A Mac app. No server, no hosted database, no web version (decided by the author on 2026-11-21).
2. **Local data.** The books live in one file in the app's data folder on the client's Mac. Nothing is stored elsewhere except copies the client chooses to make: sheets and backups.
3. **One user.** Only the client uses the app. No accounts, logins, roles or teams inside it. The accountant's access is Google Drive sharing, controlled from the app.
4. **No live bank connection in this version.** Bank data comes from files the client downloads from Westpac (decided by the author on 2026-11-21).
5. **No lodging with the ATO, no payroll, no payment processing.** The app prepares figures. The accountant or another product does the lodging and the pay runs.
6. **One client now.** Nothing from the scale version (licensing, purchase history, other banks, other clients) is built or shown.
7. **Free by default.** Anything paid (an Apple Developer account, an Open Banking provider) is the author's decision, recorded first.

## Core User Flow

1. The client downloads a statement file (OFX or CSV) for his Westpac account from Westpac Online Banking.
2. He drops it into the app. The app shows a preview: new lines, duplicates skipped, lines it could not read, and whether the closing balance matches.
3. He confirms. The new lines appear in "To review", with suggested accounts from his rules.
4. He accepts or changes each account and GST code. Each accepted line becomes a balanced journal entry.
5. He reconciles the account to the statement's closing balance.
6. At the end of a quarter he opens the BAS worksheet and the profit and loss, checks them, and publishes them to Google Sheets.
7. He shares the sheet with his accountant as a viewer, commenter or editor.
8. If the accountant changes an allowed column, the app shows the change under "Accountant changes". The client accepts or rejects it.
9. Once the BAS is done, he locks the period, so it cannot change by accident.

## Delivery Order

| Order | Delivery | What the client gets |
|---|---|---|
Rewritten on 2026-11-22: the client sees the app grow in small demos, with invented sample data, instead of waiting for whole features. Folders are in `feature-specs/README.md`.

| Order | Delivery | What the client gets |
|---|---|---|
| 0 | Wireframes (phase W) | Clickable wireframes of every screen to choose from. He signs them off before anything is built |
| 1 | Foundations and skills (folders 00, 01) | Nothing visible. A safe, packaged Mac app with tests |
| 2 | Demo 1: the app opens (02) | The real window, sidebar, every page with its empty state, light and dark, Help |
| 3 | Ledger core (03) | Nothing visible. Books that always balance |
| 4 | Demo 2: the sample book (04) | Home, Accounts and Transactions with an invented business's books |
| 5 | Demo 3: importing a Westpac file (05) | Drop a file in, see the preview in plain words, no duplicates |
| 6 | Demo 4: categorising (06) | Post lines one by one or in bulk, payees remembered, splits, transfers, undo |
| 7 | Demo 5: rules and reconciling (07) | Rules like his QuickBooks ones, fixing entries, reconciling |
| 8 | Demo 6: reports and the BAS (08) | Reports, BAS worksheet, quarter close and lock, exports, his own reports |
| 9 | Demo 7: Google Sheets (09) | Publish, preview, share per person, work in the sheet, accept the accountant's changes |
| 10 | Demo 8: contacts and invoices (10) | Contacts saved automatically, invoices from his Admin Dashboard, payments matched |
| 11 | Demo 9: settings, Help and backups (11) | Settings cards, Keep on screen, backups and restore |
| 12 | Go-live (12) | Signed app, his data moved from QuickBooks, handover, real data on his Mac |

## Features

### Bank statements

- Import Westpac OFX files, and Westpac CSV files once their layout is confirmed (client question 16).
- A preview before anything is saved: new, duplicate and unreadable lines, and a closing balance check.
- Importing the same or an overlapping file never creates duplicates.
- One or more bank accounts, each linked to an account in the chart of accounts.

### Bookkeeping

- An Australian chart of accounts to start from, which the client can edit.
- Categorise each bank line to an account and GST code, split it across several, or mark it as a transfer between his own accounts.
- Rules that suggest an account from the description, learned from how he categorises.
- Manual journal entries, for the few things that are not bank lines.
- Reconcile each bank account to a statement balance.
- Every change is recorded with when it happened, and what it was before.

### GST and reports

- GST codes on every line, with GST worked out correctly for amounts that include it.
- A BAS worksheet for a chosen period, on the client's accounting basis (cash or accrual, client question 3).
- Profit and loss, balance sheet and trial balance for any date range.
- Lock a period once its BAS is done.
- Export any report as CSV or PDF.

### Sharing with the accountant

- Connect the client's Google account once, through his normal browser.
- Publish a report to a Google Sheet in a folder the app creates in his Drive.
- Share a sheet with the accountant's email as viewer, commenter or editor, and change or remove that later.
- Bring back the accountant's edits to the allowed columns, for the client to accept or reject.
- Work freely in the published workbook: his own tabs, rows, columns and formulas, kept when he publishes again, with a Ready formulas tab. Optionally in a panel inside the app, otherwise in Chrome (added 2026-11-22).
- Customise a report's columns and rows, and save it as his own report (added 2026-11-22).

### Invoices and bills (provisional)

- Customers and suppliers, invoices with GST, invoice PDFs, bills, and matching payments to bank lines. The exact list waits for client question 1.

### Safety

- Automatic encrypted backups to a place the client picks, and a restore.
- A full export of his data, so he is never locked in.

## Scope

### In Scope

- Everything under Features, for one client, on his Mac, with Westpac as the only bank.

### Out Of Scope (for now)

Things someone will be tempted to add:

- A web app, a server, or a cloud database.
- Logins, users or roles inside the app. The accountant uses Google Sheets.
- Relying on the real Google Sheets editor inside the app window. Since 2026-11-22 it is an optional panel (spec 118), but Google may block its sign-in (see `research-notes.md`), so every job also works with "Open in Google Sheets" in Chrome.
- Live bank feeds or Open Banking (future idea F01).
- Lodging the BAS or anything else with the ATO. Single Touch Payroll. Running payroll.
- Taking card or online payments for invoices (future idea F06).
- Receipt capture by photo (future idea F05).
- Other banks, other clients, licensing, purchase history, a Windows version (future ideas F02 to F04).
- Multi-currency, inventory, projects and budgets, unless client question 1 says he uses them.

## Future Direction (not scheduled)

Recorded in `context/feature-specs/future-ideas/`. None of this changes the current product.

- F01: live bank transactions through an accredited Open Banking provider.
- F02: the scale version, with independent installs for other clients, licence keys, and purchase history through a third-party tool.
- F03: statement importers for other banks.
- F04: a Windows build.
- F05: receipt capture.
- F06: online invoice payments.
- F07: importing payroll totals from a payroll product.

## Success Criteria

1. A full quarter of invented sample data can be imported, categorised and reconciled, and the trial balance balances to the cent.
2. Importing the same file twice adds zero lines, and the preview says so.
3. The BAS worksheet figures for the sample quarter match figures worked out by hand in the test.
4. A published sheet appears in the client's Drive, and an accountant account with the chosen role sees it with only that role.
5. An accountant's edit to an allowed column shows in the app within two minutes while the app is open, and changes nothing until accepted.
6. After deleting the app's data folder, a restore from the latest backup brings back every entry.
7. The client signs off each delivery after using it with his real data, once go-live is reached.
