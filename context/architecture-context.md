# Architecture Context

How the app is built. This file describes the design as planned on 2026-11-21, and is updated before continuing whenever the code's structure changes. The data model below is as built through spec 043 (2026-11-23).

The stack below is a recommendation until `decisions/desktop-shell.md` and `decisions/local-data-storage.md` are decided. Spec 001 is blocked on both.

## What It Is Designed For

- **What matters most, in order:** correct money and data, privacy, ease of change (so the scale version can come later), speed of building.
- **The numbers:** one user on one Mac. Assumed 1 to 3 Westpac accounts and about 100 to 500 bank lines a month (client question 4), so about 6,000 lines a year and 30,000 after five years. One SQLite file of a few tens of megabytes. The largest single job is importing a year of history from QuickBooks at go-live.
- **Limits:** one developer, built mostly by a model, spec by spec. Australian tax rules apply: GST, BAS, a 1 July to 30 June financial year, and keeping records for five years. The client's data is private financial data.

## Stack

Check current versions before installing, and use the newest versions that work together. Record the exact versions in `CLAUDE.md` at spec 001.

| Layer | Technology | Role | Status |
|---|---|---|---|
| Shell | Electron | Mac app: windows, menus, file access, Keychain-backed secret storage | Recommended, decide at spec 001 |
| Build | Vite, with an Electron build tool (chosen at spec 001) | Dev server, bundles, packaged `.app` | Spec 001 |
| Language | TypeScript, strict | All code | Spec 001 |
| UI | React | Screens in the renderer | Recommended, spec 008 |
| Tables | The project's own `Table` component, or a data grid library chosen there | The spreadsheet-style screens | Spec 022 |
| Data | SQLite, through `better-sqlite3` | The books, in one file | Recommended, spec 011 |
| Encryption at rest | SQLCipher-compatible build, or FileVault only | Protect the file if the Mac is lost | Decide in `decisions/local-data-storage.md` |
| Validation | Zod | Every outside boundary | Spec 007 |
| Tests | Vitest for logic, Playwright for the packaged app | | Spec 001, spec 014 |
| Google | Google's official Node client, or plain HTTPS calls | Sheets and Drive | Folder 09 |

Cost and accounts: nothing is needed to build and run it locally. Before go-live it needs an Apple Developer account to sign and notarize the app (paid, yearly, author's decision, client question 14). The Google Cloud project is free and lives in the client's Workspace.

## Repo Layout

```
src/shared/       Result, money, dates, ids, logger, pages, shortcuts, guide format, shared types
src/domain/       pure accounting rules
src/import/       pure bank file parsers
src/data/         SQLite store, migrations, repositories
src/services/     use cases
src/google/       Google sign-in, Sheets and Drive
src/backup/       backup and restore
src/main/         Electron main process
src/preload/      the bridge
src/renderer/     React screens
tests/fixtures/   invented data and bank files
tools/            development scripts such as the seed CLI. Never packaged
guides/           user guides, shown in the app's Help
context/          planning files
```

## System Boundaries

One line per folder: what it holds, and what it must never do.

- `src/shared`: types and helpers used everywhere. Imports nothing from the project.
- `src/domain`: accounts, tax codes, journal rules, GST maths, report maths. Pure functions over plain data. Never imports the file system, the database, Electron, the network, a clock or randomness. A clock value or an id is passed in.
- `src/import`: turns file text into validated statement lines. Pure. Never reads files itself: the caller passes the text.
- `src/data`: the only code that talks to SQLite. Migrations, and repositories that return typed rows. Holds no business rules.
- `src/services`: the use cases. Each one opens one database transaction, calls the domain rules, writes through `data`, and writes the audit log. The posting service is the only writer of journal entries and lines.
- `src/google`: the only code that calls Google. Sign-in, token storage, Drive and Sheets calls. Never writes to the ledger. Returns fetched sheet edits as proposals.
- `src/backup`: copies and restores the data file. Never changes ledger data.
- `src/main`: Electron main process. Windows, menus, app lifecycle, and the bridge handlers that validate input and call services. The only folder that imports Electron, apart from `preload`.
- `src/preload`: exposes named bridge functions to the renderer through the context bridge. Nothing else.
- `src/renderer`: React screens. Calls only the bridge. Never imports Node, Electron, `data`, `services` or `google`.

Allowed import direction: `shared` ← `domain` ← `import` ← `data` ← `services` ← (`google`, `backup`) ← `main`. `preload` imports `shared` and the bridge contract. `renderer` imports `shared` and the bridge contract types only. Enforced by a lint rule set up at spec 003 (`eslint-plugin-boundaries` or an equal, checked at that spec).

## Processes

```
Main process (privileged)
  · owns the SQLite file, the file system, the Keychain-backed token store and every Google call
  · validates every bridge call with Zod, then calls a service
  · runs the Google sheet check every two minutes while the app is open (folder 09)
  · runs the scheduled backup, if switched on (folder 11)
Renderer (unprivileged)
  · React screens, sandboxed, context isolation on, no Node
  · reaches the main process only through the bridge
```

- **Data lives in:** `~/Library/Application Support/<app name>/` (`app.getPath('userData')`). The books file, the backup settings and the encrypted token file. Never inside the app bundle or the repo.
- **Development:** a build run from source uses a different app name (`<app name> Dev`), so it never opens the real data folder. Tests use a throwaway folder.
- **Build:** a packaged, signed `.app` for Apple silicon (client question 12), from a whitelist of files.

## Data Flow

```
renderer screens --> preload bridge --> main handlers --> services --> domain rules
                                                              |
                                                              +--> data (SQLite)  <-- the truth
                                                              +--> google (Sheets copies, proposals back)
                                                              +--> backup (encrypted copies)
```

The SQLite file is the source of truth for every kind of data. Reports, balances and GST figures are derived from journal lines when asked for, and never stored as totals. A Google Sheet is a copy made at a moment in time, and says so in its header.

## State Model

- **Ledger state** (SQLite): accounts, entries, lines, statement lines, rules. Changed only by services, inside one transaction each.
- **Derived state:** balances, reports, the BAS worksheet, reconciliation status. Computed from journal lines and never stored.
- **Screen state** (renderer): filters, selection, open dialogs. Never holds the only copy of anything.
- **Saved state:** the SQLite schema carries a version, changed only by numbered migrations. A migration runs inside a transaction after a backup copy is made, and the file's integrity is checked after.

## Data Model

A draft. Each table is written in full by the spec that creates it.

| Model | Purpose and key fields |
|---|---|
| `business` | One row (id 1). Name, ABN (11 digits, check digits verified), GST registered, GST basis (cash or accrual), BAS frequency (monthly or quarterly), lock date. Built at spec 030 |
| `account` | The chart of accounts. Unique code, name, type (asset, liability, equity, income, expense), optional parent, default tax code, active flag. Never deleted or merged. Spec 032 |
| `tax_code` | Four seeded GST codes (`GST` taxable 10%, `FRE` GST-free, `INP` input taxed, `N-T` outside GST), each with a treatment and a rate in basis points. Code branches on the treatment. The BAS label a line feeds is worked out in `src/domain/bas-labels.ts`, not stored. Spec 034 |
| `bank_account` | One of his bank accounts: its name, bank, the last four digits only, and the ledger `account` that holds its balance. The table was created at spec 046 (the sample books needed it), and spec 055 adds the services around it |
| `import_batch` | One imported file (spec 056). Bank account, file name (never its folder), format, a hash of the file text, period covered, counts of new, duplicate and rejected lines, the opening balance worked out from the file and the closing balance it states |
| `statement_line` | One bank line (spec 056). Bank account, batch, date, amount in cents (in positive, out negative, never zero), description, running balance if the file gives one, the line key, status (`to-review`, `posted`, `excluded`). From migration 0010 (folder 06): `entry_id`, the entry it was posted to or matched with, and `paired_line_id`, the other side of a transfer |
| `account_role` | Migration 0010. Which account holds each job the app posts to by itself: `gst` (the GST account) and `transfers` (1090 Transfers in transit, where one side of a transfer waits for the other). Code finds them by role, never by code |
| `journal_entry` | Id, date, memo, source (manual, bank line, invoice, opening balance, accountant change), source id. Spec 037 |
| `journal_line` | Entry, position, account, amount in cents (positive debit, negative credit, never zero), tax code, GST in cents (same sign as the amount, which is net), payee, memo. The database checks each line, and the posting service checks that an entry sums to zero. Spec 037 |
| `rule` | A bank rule. Order, direction, bank accounts, conditions, then account, tax code, payee, split, posts by itself (spec 078) |
| `reconciliation` | A finished reconciliation: bank account, statement date and balance (spec 085) |
| `report_layout` | A saved custom report: name, base report, columns, rows, his own columns (specs 101, 102) |
| `contact`, `contact_match` | A customer or supplier (a journal line's `payee_id` is a contact's id, which the posting service checks). `contact` was created at spec 046, because the sample books need payees. `contact_match`, the bank description words that point to a contact, came at spec 071 (migration 0010), and the contact's details at 122 |
| `invoice` and its lines | Issued invoices brought in from the Admin Dashboard (spec 126). Bills only if the client asks |
| `sheet_link` | A published sheet. Google file id, which report and period, when it was last published, and its shares |
| `accountant_change` | An edit read back from a sheet. Sheet, row key, column, old value, new value, status (waiting, accepted, rejected) |
| `audit_log` | Append-only. Id, when, kind, table, row id, JSON before and after. Created at spec 033, not 037, because account changes needed it first |
| `period_lock` | Dates up to which nothing may change, and why |

Rules across models:

- A journal entry's lines sum to zero cents. The posting service refuses anything else, and a test covers every way of posting.
- `statement_line` has a unique key on (bank account, line key): the `FITID` when the file has one, or a key worked out from the line when it has not, so a repeated import cannot add a line twice.
- Only the posting service writes `journal_entry` and `journal_line`, and every write adds an `audit_log` row in the same transaction.
- No change may touch a date on or before the lock date.
- **Changing or removing a posted entry (decided 2026-11-23 at spec 040):** `changeEntry` and `removeEntry` in the posting service replace or remove it, and the audit log row keeps its full content before and after (before only, for a removal). Nothing on or before the lock date may be changed or removed. The author said "go for it" to the spec's recommendation without choosing in words, so this is the recommendation, adopted and **awaiting the author's confirmation**. The alternative, never changing an entry and correcting only by a reversing entry, would replace these two functions with one `reverseEntry`.

## Importing A Bank File

Built at specs 055 to 066 (2026-11-24). OFX only for now: the Westpac CSV reader (spec 059) waits for the header row (client question 16).

1. The screen asks the main process to choose a file (the Mac's file chooser, `bank.chooseAndPreview`) or passes the path of a file dropped on the window (`bank.previewFile`, the path from the preload's `pathForFile`). The screens never read the file. The main process checks it is a plain file and under the size limit (5 million characters), then reads it (`src/main/statement-files.ts`).
2. The parser in `src/import/` turns the text into statement lines, or a list of lines it could not read, each with a reason. It detects the format from the content, never from the file name. The account comes from the last four digits of the account number in the file, and must match exactly one active bank account.
3. `previewImport` (`src/services/import-file.ts`) marks each line new or already held, by its key (`src/domain/duplicates.ts`), and runs the closing balance check (`src/domain/balance-check.ts`). It writes nothing. The result is held in memory in the main process (`src/main/preview-store.ts`, the last five, forgotten when the books change), and the screen gets a preview id.
4. The client confirms. `commitImport` works the duplicates out again inside one transaction, then saves the batch, the new lines (status `to-review`) and an audit row (counts and file name, no descriptions) together, or nothing.
5. Rules suggest an account for each new line (folder 07). A suggestion is never posted until the client accepts it. Posting a line is folder 06.

**The line key.** The bank's own transaction id (`FITID`) when the file has one, `id:<FITID>`. Otherwise one worked out from the day, amount, description (capitals and spacing ignored) and running balance, `calc:...`. Two lines with the same key in one file get `#2`, `#3` and so on, so two identical coffees on one day are both kept, and the same coffee in an overlapping file gets the same key. The key is unique per bank account in the table.

**The closing balance check** (decided at spec 061, because the spec left it open; the author is asked to confirm). It checks the stream of imported lines, not the ledger. From the first file for an account, its **opening balance** is worked out and stored on the batch: the closing balance less every line the file lists (including a line it could not read, when its amount could be read). For a later file, "your books after import" is that opening balance plus every imported line of the account up to the file's last day, plus the new lines. It matches the file's closing balance, or the difference is shown, and named as the line that could not be read when the lines that could not be read are exactly the difference. The first file for an account has nothing to compare with, and says so. A file older than the first one imported, or after a file that did not state its balance, says it cannot be checked. Reconciling an account to its ledger balance is folder 07.

**What is not decided here.** The sample books' bank movements are posted entries with no statement lines behind them, so importing a file into the sample books puts lines in To review that the ledger already holds as posted entries. The fixtures are built from those entries so the demo reads true. Folders 06 and 07 will decide how a statement line is matched to an entry that exists. **Decided at folder 06 (2026-11-25, spec 069a, author to confirm):** To review offers a **Match** with an entry that moves the same amount through the same bank account within five days and that no line is linked to yet. Matching links the line (`statement_line.entry_id`) and posts nothing. Posting a line with an account, a split or a transfer goes through `src/services/post-line.ts`, which posts with the posting service and links the line in the same transaction; Undo (`undo-post.ts`) removes the entry through `removeEntry` and puts the line back.

## Publishing And Sharing A Sheet

1. The client picks a report and a period, and clicks Publish.
2. The Google module creates the app's folder in his Drive if it is missing, then creates or updates one spreadsheet for that report and period. Values are written as `RAW`, so no cell is ever read as a formula.
3. Columns the accountant may edit (client question 7) are left open. Every other range is protected so only the client can edit it. A hidden key column lets each row be traced to its source.
4. Sharing sends a Drive permission for the accountant's email with the chosen role. The app never creates a link that anyone can open.

## Bringing Back The Accountant's Changes

1. While the app is open, every two minutes, the main process asks Drive whether each shared sheet has changed since it was last read.
2. For a changed sheet, it reads the open columns and compares them with what was published.
3. Each difference becomes an `accountant_change` row, waiting. Nothing in the ledger changes.
4. The client sees them under "Accountant changes" and accepts or rejects each. Accepting goes through the posting service like any other change.
5. Changes made while the Mac is off are picked up at the next check after the app opens.

## When Things Fail

| If this fails | What happens | What the user sees |
|---|---|---|
| A bank file has unreadable rows | The rows are listed with the reason. The rest can still be imported | The preview shows each rejected row |
| The closing balance does not match | The import can still go ahead | A warning in the preview, and on the bank account until reconciled |
| The app quits during an import or a post | The transaction rolls back. Nothing is half saved | The file can be imported again |
| A migration fails at launch | It rolls back, and the backup copy made before it is kept | A plain message, and the app does not open the books |
| Google is unreachable | The call times out and is retried later. Publishing is never half done in the ledger | "Could not reach Google" on the sheet, with a retry |
| The Google sign-in expired or was revoked | Sheet checks stop | A banner linking to Settings to reconnect |
| A sheet was deleted or unshared in Drive | The link is marked broken | The sheet shows as missing, with a way to publish again |
| A backup fails | The next scheduled one tries again | A warning on Home after one missed backup |

## Outside Services

- **Google Drive and Sheets:** an OAuth client of the desktop type, in a Google Cloud project owned by the client's Workspace and marked Internal. Sign-in opens the system browser, with PKCE, a random state and a one-time loopback redirect. The scope asked for is `drive.file`, which reaches only files the app created. Both points are to be confirmed at spec 106. Tokens stay in the main process. The app never deletes a file in Drive. It never shares with anyone except an email the client typed and confirmed.
- **Westpac:** none. The client downloads files himself. The app never logs in to a bank.

## Secrets And Configuration

- The Google refresh token is encrypted with Electron's `safeStorage` (backed by the macOS Keychain) and saved in the data folder. It never reaches the renderer, the logs or the database in plain text.
- The OAuth client id is configuration, not a secret, for a desktop app. It is still kept out of git in development, in `.env`, with `.env.example` listing it.
- No secret goes in the database, the logs or the renderer bundle.

## Updating

- Until go-live: the author installs new builds by hand.
- From go-live: signed automatic updates (spec in folder 12).
- What survives an update: the data folder and the token file. The app id, product name and signing identity must never change, because they decide the data folder and Keychain access.
- Before each release: install the previous version with sample data, update it, and confirm the books open and balance.

## Environments

- **Development:** the author's Mac, the `Dev` app name, invented data only, and a separate Google Cloud test project with a test account.
- **The client's Mac:** the packaged, signed app. Real data only after the go-live checks in `security-context.md`.
- **Backups:** encrypted copies to a place the client picks (folder 11). A restore is tested before go-live.
- **Running cost:** none, apart from the Apple Developer account.

## Key Decisions

- **Why a desktop app with a local file, not a web app?** The client wants his books on his own computer, and one user needs no server (`decisions/product-shape.md`).
- **Why files from Westpac and not a live feed?** Westpac's bank feeds go only to a fixed list of accounting products, and Open Banking needs an accredited provider (`decisions/bank-data-source.md`).
- **Why the app's own screens and not the Google Sheets editor inside the window?** Google often blocks sign-in inside embedded windows, which makes it unreliable (`decisions/google-sheets-approach.md`).
- **Why SQLite and not plain files?** A save is all or nothing, so a crash cannot leave half an entry (`decisions/local-data-storage.md`).

## Invariants

These must hold after every change. If a change needs to break one, stop and ask.

1. Every journal entry's lines sum to zero cents.
2. Money is integer cents in AUD everywhere in `domain`, `import`, `data` and `services`. No floats.
3. Only the posting service writes journal entries and lines, and each write adds an audit log row in the same transaction.
4. Importing the same bank file, or an overlapping one, never stores a statement line twice.
5. The SQLite file is the only source of truth. Nothing read from Google changes the ledger until the client accepts it.
6. Nothing changes on or before the lock date.
7. `src/domain` and `src/import` are pure: no file system, database, network, Electron, clock or randomness.
8. The renderer never touches files, the database, tokens or the network. It calls named bridge functions, each validated with Zod in the main process.
9. No client-specific value (business name, ABN, bank, account numbers, accountant's email) appears in code. They are data.
10. Data leaves the Mac only through an action or setting of the client's: publish, share, backup.

## Later Phases (not built)

- **Sample data (folder 04, built 2026-11-23):** demos use an invented business stored in a separate sample books file, `sample/books.db`, in a folder of its own inside the data folder, never in the real books file. `src/main/books-session.ts` holds which file is open, builds the sample books into a temporary file and renames it when they are complete, and deletes only the `sample/` folder to clear them. The real books are closed while the sample books are in use. The sample books are built by `src/services/sample/`, posting every entry through `postEntry`. The release build at go-live removes the sample data switch (spec 150).
- **Folder 10, contacts and invoices:** contacts saved automatically, invoices from the Admin Dashboard through a versioned exchange file (`decisions/admin-dashboard-link.md`), and matching payments. Bills only if the client asks.
- **Folder 11, backup and safety:** an encrypted copy of the data file on a schedule, kept for a set number of days, plus restore and full export.
- **Folder 12, go-live:** signing and notarization, automatic updates, moving the client's data from QuickBooks, handover guides.
- **Scale version (F02):** each client gets their own install and their own local file, as now. What changes is around the app: licence keys and purchase history through a third-party tool, Google sign-in moving from Internal to an External app that Google reviews, and more bank importers. The boundaries above already allow this. Importers plug into `src/import/` behind one interface, and nothing client-specific lives in code.
