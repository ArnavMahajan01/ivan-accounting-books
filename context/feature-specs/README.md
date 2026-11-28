# Feature Specs Index

Restructured on 2026-11-22 at the author's request: many small specs, grouped so the client sees the app grow in **demos**, one folder at a time, instead of waiting for whole features. Every product folder ends with a demo spec. Sample data (an invented business) is used for every demo until go-live. The old plan is in `../archive/feature-specs-2026-11-21/`, and the old to new numbers are in [RENUMBERING.md](RENUMBERING.md).

## How It Works

- **Build in number order**, one spec at a time. Numbers are global, so the order is never ambiguous.
- **Each folder is one step the client can see.** `NN-demo-N-...` folders end with a demo spec: package the app, show it with sample data, record what he says in `context/demo-feedback.md`. Changes he asks for become new specs with a letter suffix (`065a`), in that folder or a later one.
- **Internal folders** (00, 01, 03) build what the demos stand on. They have no demo of their own.
- **Sample data first.** Folder 04 builds an invented business (Harbour Lane Joinery Pty Ltd) used by every demo. His real data is used only in folder 12, on his Mac. Optional exception: at Demo 3 he may try one of his own Westpac files on his own Mac, in a throwaway trial book that never leaves his Mac (spec 067).
- **Small specs.** One spec is one verifiable step inside one boundary, about five steps at most. If a spec grows, split it with letter suffixes.

## Gates

- Phase W comes first. Spec 001 waits for W11, the client's sign-off.
- Spec 001 also waits for `decisions/desktop-shell.md` and `decisions/local-data-storage.md`.
- Folder 04 waits for spec 045 (ledger verification) to pass.
- Spec 040 waits for the author's decision on how posted entries are corrected.
- Spec 059 waits for client question 16. Spec 125 waits for `decisions/admin-dashboard-link.md`.
- Spec 107 waits for the setup spec 106. Spec 144 waits for 143.
- Real client data only in folder 12, and in the optional Demo 3 trial on his Mac.

## Every Spec

These apply to every spec, so the specs do not repeat them:

- `npm run check` passes, and the output was read, not just the exit code.
- New logic has tests next to it. No test is weakened or skipped.
- No hard rule in `CLAUDE.md` is broken. Invented data only.
- Docs, guides and the progress tracker match the code. A progress record is written in `context/progress/`.
- **Every screen:** loading, empty, error and long-content states; light and dark; 1100 by 700 and 1440 wide; keyboard only; "Sample data" label when sample data is loaded; Impeccable `critique` and `audit` with P0 and P1 fixed (`ui-context.md`, "How Screens Are Made").
- **Every demo:** all checks, `npm run test:e2e` and `npm run package` pass; Impeccable `polish` on the folder's screens; feedback recorded the same day.

## Numbering

- A folder is named `NN-short-name`. A folder inserted later takes a letter: `05a-...`.
- A spec file is `NNN-short-name.md`. A spec inserted later takes a letter: `065a-...`. Numbers are not changed again. The one renumbering, on 2026-11-22 before any spec was started, is recorded in `RENUMBERING.md`.
- Phase W uses `W` numbers and future ideas use `F`. A redo after client feedback takes a letter: `W05c`.
- Spec titles starting "Skill:" create a skill, "setup-" are steps outside the code, "guide-" write a user guide, "Demo N:" show the client.

## Folders

```
feature-specs/
  README.md, RENUMBERING.md, SPEC-TEMPLATE.md
  W-wireframes/                      W01-W11, W01a-W01b (UI skills, done), W12-W17 (brainstorm)
  00-foundations/                    001-014  internal
  01-agent-skills/                   015-019  internal
  02-demo-1-the-app-opens/           020-029  Demo 1
  03-ledger-core/                    030-045  internal
  04-demo-2-the-sample-book/         046-054  Demo 2
  05-demo-3-bank-import/             055-067  Demo 3
  06-demo-4-to-review/               068-077  Demo 4
  07-demo-5-rules-and-reconcile/     078-088  Demo 5
  08-demo-6-reports-and-bas/         089-104  Demo 6
  09-demo-7-google-sheets/           105-121  Demo 7
  10-demo-8-contacts-and-invoices/   122-131  Demo 8
  11-demo-9-settings-help-backup/    132-141  Demo 9
  12-go-live/                        142-151  go-live with real data
  future-ideas/                      F01-F07 (not scheduled)
```

## W-wireframes: Wireframes and UI Skills (W01–W11)

Clickable black-and-white wireframes of every screen, shown to the client and signed off before any app code is written. Uses Magdoub's `wireframe` skill (`decisions/ui-and-wireframe-skills.md`). Nothing here is app code, and no repository is needed until W01, step 5.

| # | Spec |
|---|---|
| W01 | [Skill: Wireframe](W-wireframes/W01-skill-wireframe.md) |
| W01a | [Skill: Impeccable (main UI skill)](W-wireframes/W01a-skill-impeccable.md) (done 2026-11-22, was 011a) |
| W01b | [Skill: UI UX Pro Max (second UI skill)](W-wireframes/W01b-skill-ui-ux-pro-max.md) (done 2026-11-22, was 011b) |
| W02 | [Wireframe Design Context](W-wireframes/W02-wireframe-design-context.md) |
| W03 | [Wireframe: App Shell and Home](W-wireframes/W03-wireframe-app-shell-and-home.md) |
| W04 | [Wireframe: Bank Page and Import Preview](W-wireframes/W04-wireframe-bank-import.md) |
| W05 | [Wireframe: To Review (Categorising)](W-wireframes/W05-wireframe-to-review.md) (Option 1 updated 2026-11-22 from the QuickBooks screenshots) |
| W05a | [Wireframe: Bank Rules](W-wireframes/W05a-wireframe-bank-rules.md) (added 2026-11-22) |
| W05b | [Wireframe: Transactions and Chart of Accounts](W-wireframes/W05b-wireframe-transactions-and-accounts.md) (added 2026-11-22) |
| W06 | [Wireframe: Reports and BAS Worksheet](W-wireframes/W06-wireframe-reports-and-bas.md) |
| W06a | [Wireframe: Customise a Report](W-wireframes/W06a-wireframe-customise-a-report.md) (added 2026-11-22) |
| W07 | [Wireframe: Sharing With the Accountant](W-wireframes/W07-wireframe-sharing-with-accountant.md) |
| W07a | [Wireframe: Working With the Google Sheet](W-wireframes/W07a-wireframe-working-with-the-google-sheet.md) (added 2026-11-22) |
| W08 | [Wireframe: Invoices and Bills](W-wireframes/W08-wireframe-invoices-and-bills.md) (only if client question 1 says so) |
| W08a | [Wireframe: Invoices From the Admin Dashboard](W-wireframes/W08a-wireframe-invoices-from-admin-dashboard.md) (added 2026-11-22) |
| W08b | [Wireframe: Contacts, Saved Automatically, With a Page for Each](W-wireframes/W08b-wireframe-contacts.md) (added 2026-11-22) |
| W09 | [Wireframe: Settings](W-wireframes/W09-wireframe-settings.md) |
| W09a | [Wireframe: Help and Guides](W-wireframes/W09a-wireframe-help-and-guides.md) (added 2026-11-22) |
| W10 | [Client Review Pack](W-wireframes/W10-client-review-pack.md) |
| W11 | [Wireframe Sign-Off](W-wireframes/W11-wireframe-sign-off.md) |

**Brainstorm (added 2026-11-22).** Wireframes of future ideas, in `wireframe/future/`. They do not gate W11 or spec 001, do not schedule anything, and are not in the client review pack. F04 (Windows) has none: it has no new screens.

| # | Spec |
|---|---|
| W12 | [Wireframe: Live Bank Feed (brainstorm)](W-wireframes/W12-wireframe-f01-live-bank-feed.md), for F01 |
| W13 | [Wireframe: Scale Version First Run and Licence (brainstorm)](W-wireframes/W13-wireframe-f02-scale-version-first-run.md), for F02 |
| W14 | [Wireframe: Other Bank Importers (brainstorm)](W-wireframes/W14-wireframe-f03-other-bank-importers.md), for F03 |
| W15 | [Wireframe: Receipt Capture (brainstorm)](W-wireframes/W15-wireframe-f05-receipt-capture.md), for F05 |
| W16 | [Wireframe: Online Invoice Payments (brainstorm)](W-wireframes/W16-wireframe-f06-online-invoice-payments.md), for F06 |
| W17 | [Wireframe: Payroll Totals Import (brainstorm)](W-wireframes/W17-wireframe-f07-payroll-totals-import.md), for F07 |

## 00-foundations: Foundations (001–014)

Internal. Tooling, safe empty app, local store. Nothing to show the client yet.

| # | Spec |
|---|---|
| 001 | [Initialize the Repository and Tooling](00-foundations/001-init-repo.md) |
| 002 | [Folder Skeleton and Path Aliases](00-foundations/002-folder-skeleton.md) |
| 003 | [Import Boundary and Purity Lint Rules](00-foundations/003-boundary-rules.md) |
| 004 | [Result Type and Literal Kinds](00-foundations/004-result-and-kinds.md) |
| 005 | [Money in Integer Cents](00-foundations/005-money.md) |
| 006 | [Calendar Dates and the Clock](00-foundations/006-dates.md) |
| 007 | [Ids, Logger and Environment](00-foundations/007-ids-logger-env.md) |
| 008 | [Hardened Electron Window](00-foundations/008-electron-window.md) |
| 009 | [Bridge Contract and the First Bridge Function](00-foundations/009-bridge-contract.md) |
| 010 | [App Name, Data Folders and Log File](00-foundations/010-data-folders.md) |
| 011 | [SQLite Store and Migration Runner](00-foundations/011-sqlite-store.md) |
| 012 | [Pre-Migration Copy and Integrity Check](00-foundations/012-migration-safety.md) |
| 013 | [Packaged Mac App and Fuses](00-foundations/013-package-app.md) |
| 014 | [Package Contents Check and First End-to-End Test](00-foundations/014-package-checks.md) |

## 01-agent-skills: Agent Skills (015–019)

Internal. Skills for the tools used from the start. The two UI skills were installed early, as W01a and W01b.

| # | Spec |
|---|---|
| 015 | [Skills Index and the Kit's Workflow Skills](01-agent-skills/015-skills-index.md) |
| 016 | [Skill: Electron](01-agent-skills/016-skill-electron.md) |
| 017 | [Skill: SQLite and Migrations](01-agent-skills/017-skill-sqlite.md) |
| 018 | [Skill: Australian Bookkeeping Rules](01-agent-skills/018-skill-bookkeeping.md) |
| 019 | [Skill: React Renderer](01-agent-skills/019-skill-react.md) |

## 02-demo-1-the-app-opens: Demo 1: The App Opens (020–029)

The client sees the real Mac app for the first time: the window, the sidebar, every page with its empty state, light and dark, and Help with a first guide.

| # | Spec |
|---|---|
| 020 | [Design Tokens, Light and Dark](02-demo-1-the-app-opens/020-design-tokens.md) |
| 021 | [Basic Components: Button, Badge, Amount, Date](02-demo-1-the-app-opens/021-basic-components.md) |
| 022 | [Table Component](02-demo-1-the-app-opens/022-table-component.md) |
| 023 | [Empty State, Sheet, Confirm and Sample Data Label](02-demo-1-the-app-opens/023-feedback-components.md) |
| 024 | [App Layout: Window, Sidebar and Toolbar](02-demo-1-the-app-opens/024-app-layout.md) |
| 025 | [Every Page With Its Empty State](02-demo-1-the-app-opens/025-empty-pages.md) |
| 026 | [Keyboard, Focus and Mac Menus](02-demo-1-the-app-opens/026-keyboard-and-menus.md) |
| 027 | [Help: Guide Format and the Getting Started Guide](02-demo-1-the-app-opens/027-guide-format.md) |
| 028 | [Help: Guide List, Search and Reader](02-demo-1-the-app-opens/028-help-reader.md) |
| 029 | [Demo 1: The App Opens](02-demo-1-the-app-opens/029-demo-1.md) |

## 03-ledger-core: Ledger Core (030–045)

Internal. Accounts, GST, balanced posting and balances, tested and usable from a development command. Demo 2 shows it with sample data.

| # | Spec |
|---|---|
| 030 | [Business Settings](03-ledger-core/030-business-settings.md) |
| 031 | [Financial Year and BAS Periods](03-ledger-core/031-periods.md) |
| 032 | [Accounts and the Default Chart](03-ledger-core/032-accounts.md) |
| 033 | [Manage Accounts Service](03-ledger-core/033-manage-accounts.md) |
| 034 | [Tax Codes](03-ledger-core/034-tax-codes.md) |
| 035 | [GST Maths](03-ledger-core/035-gst-maths.md) |
| 036 | [BAS Labels](03-ledger-core/036-bas-labels.md) |
| 037 | [Journal and Audit Tables](03-ledger-core/037-journal-tables.md) |
| 038 | [Entry Validation](03-ledger-core/038-entry-validation.md) |
| 039 | [Posting Service: Post an Entry](03-ledger-core/039-post-entry.md) |
| 040 | [Posting Service: Change and Remove](03-ledger-core/040-change-entry.md) |
| 041 | [Only the Posting Service Writes the Ledger](03-ledger-core/041-single-writer.md) |
| 042 | [Balances and Trial Balance](03-ledger-core/042-balances.md) |
| 043 | [Books Check on Launch](03-ledger-core/043-books-check.md) |
| 044 | [Ledger Command Line for Development](03-ledger-core/044-ledger-cli.md) |
| 045 | [Ledger Core Verification](03-ledger-core/045-ledger-verify.md) |

## 04-demo-2-the-sample-book: Demo 2: The Sample Book (046–054)

The client sees his app with numbers in it: an invented business's books on Home, Accounts and Transactions, clearly labelled as sample data.

| # | Spec |
|---|---|
| 046 | [Sample Business Data Set](04-demo-2-the-sample-book/046-sample-dataset.md) |
| 047 | [Load and Clear Sample Data](04-demo-2-the-sample-book/047-sample-switch.md) |
| 048 | [Home: Summary Numbers and Warnings](04-demo-2-the-sample-book/048-home-numbers.md) |
| 049 | [Home: Next Steps List](04-demo-2-the-sample-book/049-home-next-steps.md) |
| 050 | [Chart of Accounts Screen](04-demo-2-the-sample-book/050-accounts-screen.md) |
| 051 | [Transactions List](04-demo-2-the-sample-book/051-transactions-list.md) |
| 052 | [Transaction Detail and History Panel](04-demo-2-the-sample-book/052-transaction-detail.md) |
| 053 | [guide-reading-your-books](04-demo-2-the-sample-book/053-guide-reading-books.md) |
| 054 | [Demo 2: The Sample Book](04-demo-2-the-sample-book/054-demo-2.md) |

## 05-demo-3-bank-import: Demo 3: Importing a Westpac File (055–067)

The client drops a Westpac statement file into the app and sees a preview in plain words, then the lines arrive. Invented files first. He may try his own file on his own Mac.

| # | Spec |
|---|---|
| 055 | [Bank Accounts](05-demo-3-bank-import/055-bank-accounts.md) |
| 056 | [Statement Lines and Import Batches](05-demo-3-bank-import/056-statement-lines.md) |
| 057 | [Invented Westpac Files for Tests and Demos](05-demo-3-bank-import/057-fixture-files.md) |
| 058 | [OFX Reader](05-demo-3-bank-import/058-ofx-reader.md) |
| 059 | [Westpac CSV Reader](05-demo-3-bank-import/059-csv-reader.md) |
| 060 | [Duplicate and Overlap Detection](05-demo-3-bank-import/060-duplicates.md) |
| 061 | [Closing Balance Check](05-demo-3-bank-import/061-balance-check.md) |
| 062 | [Import Preview Service](05-demo-3-bank-import/062-import-preview.md) |
| 063 | [Import Commit Service](05-demo-3-bank-import/063-import-commit.md) |
| 063a | [Undo an Import](05-demo-3-bank-import/063a-undo-import.md) |
| 064 | [Bank Page](05-demo-3-bank-import/064-bank-page.md) |
| 065 | [Import Preview Sheet](05-demo-3-bank-import/065-import-sheet.md) |
| 065a | [Undo an Import, on the Bank Page](05-demo-3-bank-import/065a-undo-import-screen.md) |
| 065b | [The Closing Balance Warning Says Importing Is Still Allowed](05-demo-3-bank-import/065b-mismatch-wording.md) |
| 065c | [Table Columns Hold at Any Window Size, and a Layout Sweep](05-demo-3-bank-import/065c-table-columns-and-layout-sweep.md) |
| 066 | [guide-import-a-westpac-file](05-demo-3-bank-import/066-guide-import.md) |
| 067 | [Demo 3: Importing a Westpac File](05-demo-3-bank-import/067-demo-3.md) |

## 06-demo-4-to-review: Demo 4: Categorising in To Review (068–077)

The client posts bank lines: one at a time or many at once, with payees remembered, splits, transfers and suggestions, laid out like his QuickBooks "For review" tab.

| # | Spec |
|---|---|
| 068 | [To Review Screen](06-demo-4-to-review/068-review-screen.md) |
| 069 | [Post One Line With an Account and GST](06-demo-4-to-review/069-post-one.md) |
| 069a | [Match a Line to an Entry Already in the Books](06-demo-4-to-review/069a-match-existing-entry.md) (added 2026-11-25) |
| 070 | [Post Many Lines at Once](06-demo-4-to-review/070-post-many.md) |
| 071 | [Payees Saved and Filled In](06-demo-4-to-review/071-payees.md) |
| 072 | [Split a Line Across Accounts](06-demo-4-to-review/072-split-line.md) |
| 073 | [Transfers Between His Accounts](06-demo-4-to-review/073-transfers.md) |
| 074 | [Suggestions From Past Lines](06-demo-4-to-review/074-suggestions.md) |
| 075 | [Undo the Last Post](06-demo-4-to-review/075-undo-post.md) |
| 076 | [guide-to-review](06-demo-4-to-review/076-guide-review.md) |
| 077 | [Demo 4: Categorising](06-demo-4-to-review/077-demo-4.md) |

## 07-demo-5-rules-and-reconcile: Demo 5: Rules, Fixing Entries and Reconciling (078–088)

Rules like his QuickBooks ones, fixing posted entries, managing accounts, and reconciling to the statement.

| # | Spec |
|---|---|
| 078 | [Rules: Data and Matching](07-demo-5-rules-and-reconcile/078-rules-engine.md) |
| 079 | [Rules List Screen](07-demo-5-rules-and-reconcile/079-rules-list.md) |
| 080 | [Rule Editor With Test](07-demo-5-rules-and-reconcile/080-rule-editor.md) |
| 081 | [Rules That Post by Themselves](07-demo-5-rules-and-reconcile/081-auto-post.md) |
| 082 | ["Do This Every Time?" After Posting](07-demo-5-rules-and-reconcile/082-rule-from-line.md) |
| 083 | [Change the Account on Posted Transactions](07-demo-5-rules-and-reconcile/083-fix-posted.md) |
| 084 | [Manage Accounts on Screen](07-demo-5-rules-and-reconcile/084-accounts-edit.md) |
| 085 | [Reconcile Service](07-demo-5-rules-and-reconcile/085-reconcile-service.md) |
| 086 | [Reconcile Screen](07-demo-5-rules-and-reconcile/086-reconcile-screen.md) |
| 087 | [guide-rules-and-reconciling](07-demo-5-rules-and-reconcile/087-guide-rules.md) |
| 088 | [Demo 5: Rules, Fixing Entries and Reconciling](07-demo-5-rules-and-reconcile/088-demo-5.md) |

## 08-demo-6-reports-and-bas: Demo 6: Reports and the BAS (089–104)

Profit and loss, balance sheet, trial balance, the BAS worksheet, locking a quarter, exports, and reports he can shape himself.

| # | Spec |
|---|---|
| 089 | [Report Figures by Account and Period](08-demo-6-reports-and-bas/089-report-figures.md) |
| 090 | [Profit and Loss Screen](08-demo-6-reports-and-bas/090-pl-screen.md) |
| 091 | [Balance Sheet Screen](08-demo-6-reports-and-bas/091-bs-screen.md) |
| 092 | [Trial Balance Screen](08-demo-6-reports-and-bas/092-tb-screen.md) |
| 093 | [Lines Behind a Figure](08-demo-6-reports-and-bas/093-drill-down.md) |
| 094 | [BAS Worksheet Figures](08-demo-6-reports-and-bas/094-bas-figures.md) |
| 095 | [BAS Worksheet Screen](08-demo-6-reports-and-bas/095-bas-screen.md) |
| 096 | [Period Lock Service](08-demo-6-reports-and-bas/096-lock-service.md) |
| 097 | [Quarter Close Checklist and Lock](08-demo-6-reports-and-bas/097-quarter-close.md) |
| 098 | [Export a Report to CSV](08-demo-6-reports-and-bas/098-export-csv.md) |
| 099 | [Export a Report to PDF](08-demo-6-reports-and-bas/099-export-pdf.md) |
| 100 | [Customise a Report: Columns and Rows](08-demo-6-reports-and-bas/100-customise-report.md) |
| 101 | [My Reports: Saved Layouts](08-demo-6-reports-and-bas/101-saved-reports.md) |
| 102 | [His Own Columns: Notes and Picked Calculations](08-demo-6-reports-and-bas/102-own-columns.md) |
| 103 | [guide-reports-and-bas](08-demo-6-reports-and-bas/103-guide-reports.md) |
| 104 | [Demo 6: Reports and the BAS](08-demo-6-reports-and-bas/104-demo-6.md) |

## 09-demo-7-google-sheets: Demo 7: Google Sheets and the Accountant (105–121)

Publishing to a workbook in his Google Drive, sharing it per person, working freely in the sheet, ready formulas, and accepting the accountant's changes. Uses a test Google account until go-live.

| # | Spec |
|---|---|
| 105 | [Skill: Google Sheets and Drive APIs](09-demo-7-google-sheets/105-skill-google.md) |
| 106 | [setup-google-cloud-project](09-demo-7-google-sheets/106-setup-google.md) |
| 107 | [Connect a Google Account](09-demo-7-google-sheets/107-connect-google.md) |
| 108 | [Disconnect, and the Expired Connection Banner](09-demo-7-google-sheets/108-disconnect-google.md) |
| 109 | [Workbook Layout](09-demo-7-google-sheets/109-workbook-layout.md) |
| 110 | [Publish a Report to a New Workbook](09-demo-7-google-sheets/110-publish-new.md) |
| 111 | [Publish Again Into the Same Workbook](09-demo-7-google-sheets/111-publish-again.md) |
| 112 | [Sheet-Style Preview Before Publishing](09-demo-7-google-sheets/112-sheet-preview.md) |
| 113 | [Ready Formulas Tab](09-demo-7-google-sheets/113-ready-formulas.md) |
| 114 | [Share a Workbook](09-demo-7-google-sheets/114-share-workbook.md) |
| 115 | [Shared Sheets Screen: By Person](09-demo-7-google-sheets/115-shared-screen.md) |
| 116 | [Read Back the Accountant's Changes](09-demo-7-google-sheets/116-read-back.md) |
| 117 | [Accountant Changes Screen](09-demo-7-google-sheets/117-changes-screen.md) |
| 118 | [Google Sheet Inside the App](09-demo-7-google-sheets/118-in-app-sheet.md) |
| 119 | [Open Side by Side in Chrome](09-demo-7-google-sheets/119-side-by-side.md) |
| 120 | [guide-sharing-with-your-accountant](09-demo-7-google-sheets/120-guide-sharing.md) |
| 121 | [Demo 7: Google Sheets and the Accountant](09-demo-7-google-sheets/121-demo-7.md) |

## 10-demo-8-contacts-and-invoices: Demo 8: Contacts and Invoices (122–131)

Customers and suppliers saved automatically, a page for each, and invoices from his Admin Dashboard with payments matched.

| # | Spec |
|---|---|
| 122 | [Contacts: Data and Automatic Saving](10-demo-8-contacts-and-invoices/122-contacts-data.md) |
| 123 | [Contacts List and Contact Page](10-demo-8-contacts-and-invoices/123-contacts-screen.md) |
| 124 | [Merge Duplicate Contacts](10-demo-8-contacts-and-invoices/124-merge-contacts.md) |
| 125 | [Invoice Exchange File](10-demo-8-contacts-and-invoices/125-invoice-format.md) |
| 126 | [Import Invoices From a File](10-demo-8-contacts-and-invoices/126-invoice-import.md) |
| 127 | [Linked Folder Pick-Up](10-demo-8-contacts-and-invoices/127-linked-folder.md) |
| 128 | [Customers' Balances and Overdue Invoices](10-demo-8-contacts-and-invoices/128-customer-balances.md) |
| 129 | [Match a Deposit to Invoices](10-demo-8-contacts-and-invoices/129-match-payment.md) |
| 130 | [guide-contacts-and-invoices](10-demo-8-contacts-and-invoices/130-guide-contacts.md) |
| 131 | [Demo 8: Contacts and Invoices](10-demo-8-contacts-and-invoices/131-demo-8.md) |

## 11-demo-9-settings-help-backup: Demo 9: Settings, Help and Backups (132–141)

Settings with status cards, the rest of Help from the Admin Dashboard pattern, backups and restore.

| # | Spec |
|---|---|
| 132 | [Settings: Business, GST and BAS](11-demo-9-settings-help-backup/132-settings-business.md) |
| 133 | [Settings: Status Cards](11-demo-9-settings-help-backup/133-settings-cards.md) |
| 134 | [Help: Stars, Tags and Keep on Screen](11-demo-9-settings-help-backup/134-help-stars-tags.md) |
| 135 | [Help: "?" on Each Page](11-demo-9-settings-help-backup/135-help-per-page.md) |
| 136 | [Encrypted Backup](11-demo-9-settings-help-backup/136-backup.md) |
| 137 | [Backup Schedule and Reminders](11-demo-9-settings-help-backup/137-backup-schedule.md) |
| 138 | [Restore From a Backup](11-demo-9-settings-help-backup/138-restore.md) |
| 139 | [Full Data Export](11-demo-9-settings-help-backup/139-full-export.md) |
| 139a | [Any Bank: Words and File Types](11-demo-9-settings-help-backup/139a-any-bank-words.md) |
| 139b | [OFX From Any Bank](11-demo-9-settings-help-backup/139b-ofx-any-bank.md) |
| 139c | [CSV Reader With a Column Map](11-demo-9-settings-help-backup/139c-csv-column-map.md) |
| 139d | [Saved Column Maps and CSV Import](11-demo-9-settings-help-backup/139d-saved-column-maps.md) |
| 139e | ["Match Your Bank's Columns" Screen](11-demo-9-settings-help-backup/139e-map-columns-screen.md) |
| 139f | [guide-import-from-any-bank](11-demo-9-settings-help-backup/139f-guide-any-bank.md) |
| 140 | [guide-backups-and-settings](11-demo-9-settings-help-backup/140-guide-settings.md) |
| 141 | [Demo 9: Settings, Help and Backups](11-demo-9-settings-help-backup/141-demo-9.md) |

## 12-go-live: Go-Live (142–151)

Security review, signing, updates, moving his real data from QuickBooks, and handing over. Real client data is used only here, on his Mac.

| # | Spec |
|---|---|
| 142 | [Security Review of the Whole App](12-go-live/142-security-review.md) |
| 143 | [setup-apple-developer-signing](12-go-live/143-setup-signing.md) |
| 144 | [Signed and Notarized Build](12-go-live/144-signed-build.md) |
| 145 | [Automatic Updates](12-go-live/145-auto-update.md) |
| 146 | [Move From QuickBooks: Accounts and Contacts](12-go-live/146-qb-accounts.md) |
| 147 | [Move From QuickBooks: Opening Balances](12-go-live/147-qb-opening.md) |
| 148 | [Move From QuickBooks: This Year's Transactions](12-go-live/148-qb-transactions.md) |
| 149 | [Move From QuickBooks: Rules](12-go-live/149-qb-rules.md) |
| 150 | [Handover Guides and Walkthrough](12-go-live/150-handover.md) |
| 151 | [Go-Live Check With the Client](12-go-live/151-go-live-check.md) |

## Future Ideas (not scheduled)

| # | Idea |
|---|---|
| F01 | [Open Banking Live Feed](future-ideas/F01-open-banking-live-feed.md) |
| F02 | [Scale Version for Other Clients](future-ideas/F02-scale-version.md) |
| F03 | [Importers for Other Banks](future-ideas/F03-other-bank-importers.md) |
| F04 | [Windows Build](future-ideas/F04-windows-build.md) |
| F05 | [Receipt Capture](future-ideas/F05-receipt-capture.md) |
| F06 | [Online Invoice Payments](future-ideas/F06-online-invoice-payments.md) |
| F07 | [Payroll Totals Import](future-ideas/F07-payroll-totals-import.md) |
