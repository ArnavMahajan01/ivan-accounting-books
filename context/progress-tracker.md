# Progress Tracker

Update this file whenever the current phase, the active spec or the implementation state changes.

**How to record a finished spec:** write `context/progress/<spec file name>.md` from `context/progress/PROGRESS-TEMPLATE.md` (what was done, how it was verified, notes), then add a row to **Completed**, and refresh **Next Up**. Keep details in the progress file, not here.

## Current Phase

- **Folder 00, foundations (2026-11-22): done.** Specs 001 to 014 on branch `feature/00-foundations`. The author committed 001 to 006. 007 to 014 are not committed yet. The packaged Mac app builds, passes the package contents check and its end-to-end test, and opens empty books at schema version 1. The author allowed folder 00 to start before wireframe sign-off. Screens (spec 020 onward) still wait for W11.
- **Folder 01, agent skills (2026-11-22): done.** Specs 015 to 019 on branch `feature/01-agent-skills`, not committed yet. Eleven skills in `.claude/skills/`: the three UI and wireframe skills, the kit's four workflow skills, and four technology skills (Electron, SQLite and migrations, Australian bookkeeping rules, React renderer).
- **Folder 02, Demo 1 (2026-11-22): started** on branch `feature/02-demo-1-the-app-opens`. The first folder with screens. Specs 020 to 028 are built (tokens, components, layout, every page, Mac menus and shortcuts, the guide format with Getting started, the Help reader). Only 029, the demo itself, is left.
- **Folder 04, Demo 2, the sample book (2026-11-23): built, demo not yet held.** Specs 046 to 053 are built, and 054 is prepared. It is on branch `feature/03-ledger-core`, because the author chose to build it there and sort out git afterwards. The first screens with numbers: Home (the four numbers and the to-do list), Accounts, Transactions with its panel, the guide "Reading your books", and the sample data itself (a separate file, loaded and cleared from Settings, with a "Sample data" label on every page). The figures match the signed-off wireframes exactly on 23 November 2026. Nothing is committed yet.
- **Folder 03, the ledger core (2026-11-23): done** on branch `feature/03-ledger-core`, specs 030 to 045, not committed yet. All backend and tests: business settings, financial year and BAS periods, the chart of 39 accounts, the four GST codes, GST maths, BAS labels, the journal and audit tables, entry validation, the posting service (post, change, remove), the guard that only it writes the books, balances and the trial balance, the launch check, and a terminal tool (`npm run ledger`). The client sees nothing from it. Demo 2 (folder 04) is the first time he sees numbers. Spec 029 (Demo 1) was skipped for now, at the author's instruction.
- **Phase W, wireframes: done 2026-11-22.** The client signed off, with the recommended option on every screen (`decisions/wireframe-sign-off.md`). W08 waits for client question 1.

## Current Goal

- The author clicks through every option in `wireframe/index.html`, then walks the client through them and fills in `context/wireframe-feedback.md` (W10). Redos become new W specs. W11 records the sign-off before any code.
- Meanwhile, the two open decisions are made (`decisions/desktop-shell.md`, `decisions/local-data-storage.md`), so spec 001 can start once W11 is done.
- The author asks the client the questions in `client-questions.md`, starting with 1 to 8 and 18 to 21. Question 1 decides whether W08 is needed.

## How To Run

- Wireframes: open `wireframe/index.html` in a browser. No build step.
- Code checks: `npm install`, then `npm run check` (typecheck, lint, test). The full list is in `CLAUDE.md` section 4.
- The app: `npm run dev` (development, ` Dev` data folder). The packaged app: `npm run package`, then open `release/mac-arm64/Accounting Books.app` (right-click, Open, the first time). `npm run test:e2e` packages and tests it.

## In Progress

| # | Spec | State |
|---|---|---|
| W01 | [Skill: Wireframe](feature-specs/W-wireframes/W01-skill-wireframe.md) | Installed, byte for byte from commit `44a5814`. Not yet checked: `/wireframe` showing in a new session. Step 5 (git) waits for the author |
| W02 | [Wireframe Design Context](feature-specs/W-wireframes/W02-wireframe-design-context.md) | Written from the context files. No screenshots were supplied, so there are none to check |
| W08 | [Wireframe: Invoices and Bills](feature-specs/W-wireframes/W08-wireframe-invoices-and-bills.md), if question 1 says so | W |
| 029 | [Demo 1: The App Opens](feature-specs/02-demo-1-the-app-opens/029-demo-1.md), skipped while the ledger core and Demo 2 were built | 02 |
| 054 | [Demo 2: The Sample Book](feature-specs/04-demo-2-the-sample-book/054-demo-2.md): the demo itself and the client's feedback, for the author | 04 |
| 055 | [Bank Accounts](feature-specs/05-demo-3-bank-import/055-bank-accounts.md): the table exists already, so this adds the services | 05 |
| 056 | [Statement Lines and Import Batches](feature-specs/05-demo-3-bank-import/056-statement-lines.md) | 05 |

After folder 00: the first client demo is spec 029 (Demo 1: the app opens). Demos follow at 054, 067, 077, 088, 104, 121, 131 and 141, then go-live at 151.

## Completed

Newest first.

| # | Spec | What it does | Status | Date |
|---|---|---|---|---|
| 054 | [Demo 2: The Sample Book](feature-specs/04-demo-2-the-sample-book/054-demo-2.md) | The demo script and questions are written (`context/demo-scripts/`). The demo is for the author, and no feedback was invented | Prepared (demo not held) | 2026-11-23 |
| 053 | [Guide: Reading Your Books](feature-specs/04-demo-2-the-sample-book/053-guide-reading-books.md) | A guide for Home, Accounts and Transactions with four real images. Every step followed in the app by a script, 23 checks | Done | 2026-11-23 |
| 052 | [Transaction Detail and History Panel](feature-specs/04-demo-2-the-sample-book/052-transaction-detail.md) | A side panel: lines that sum to zero, and a history in words (Posted, Changed). Escape closes it | Done (Impeccable skill not run) | 2026-11-23 |
| 051 | [Transactions List](feature-specs/04-demo-2-the-sample-book/051-transactions-list.md) | Every entry as a row, with filters, search by word or amount, paging and exact totals; 1,000 entries tested | Done (Impeccable skill not run) | 2026-11-23 |
| 050 | [Chart of Accounts Screen](feature-specs/04-demo-2-the-sample-book/050-accounts-screen.md) | Grouped chart with balances that match the trial balance to the cent, search, and a link to each account's transactions | Done (Impeccable skill not run) | 2026-11-23 |
| 049 | [Home: Next Steps List](feature-specs/04-demo-2-the-sample-book/049-home-next-steps.md) | The pure rules for the to-do list. No job's feature exists yet, so it says up to date; brand-new books show Getting started | Done (Impeccable skill not run) | 2026-11-23 |
| 048 | [Home: Summary Numbers and Warnings](feature-specs/04-demo-2-the-sample-book/048-home-numbers.md) | The four numbers from the wireframe, as links, exactly matching it on the sample books; books-check warnings | Done (Impeccable skill not run) | 2026-11-23 |
| 047 | [Load and Clear Sample Data](feature-specs/04-demo-2-the-sample-book/047-sample-switch.md) | A separate sample books file, a first-launch choice, the label on every page, Settings Developer; the packaged app tested end to end | Done | 2026-11-23 |
| 046 | [Sample Business Data Set](feature-specs/04-demo-2-the-sample-book/046-sample-dataset.md) | Harbour Lane Joinery's books, built through the posting service, matching the wireframes' figures; identical every time | Done | 2026-11-23 |
| 045 | [Ledger Core Verification](feature-specs/03-ledger-core/045-ledger-verify.md) | Every check, the package and the end-to-end test pass; the ten invariants audited; L1, L2, L4 marked fixed | Done | 2026-11-23 |
| 044 | [Ledger Command Line for Development](feature-specs/03-ledger-core/044-ledger-cli.md) | `npm run ledger -- init|trial-balance|check --file`; refuses the app's data folder | Done | 2026-11-23 |
| 043 | [Books Check on Launch](feature-specs/03-ledger-core/043-books-check.md) | Integrity and balance checked on every launch, logged with counts, and `books.getHealth` on the bridge | Done | 2026-11-23 |
| 042 | [Balances and Trial Balance](feature-specs/03-ledger-core/042-balances.md) | The trial balance for any date range, from journal lines, matching a hand-worked year to the cent | Done | 2026-11-23 |
| 041 | [Only the Posting Service Writes the Ledger](feature-specs/03-ledger-core/041-single-writer.md) | Guard tests that fail on any other journal write; shown failing with a throwaway insert | Done | 2026-11-23 |
| 040 | [Posting Service: Change and Remove](feature-specs/03-ledger-core/040-change-entry.md) | Change or remove a posted entry with its full history in the audit log, refused on or before the lock date | Done (decision awaiting the author) | 2026-11-23 |
| 039 | [Posting Service: Post an Entry](feature-specs/03-ledger-core/039-post-entry.md) | The single writer: validates, writes entry, lines and audit row in one transaction; six forced failures leave nothing | Done | 2026-11-23 |
| 038 | [Entry Validation](feature-specs/03-ledger-core/038-entry-validation.md) | The pure check: balance, two lines, zero lines, GST sign, accounts, lock date | Done | 2026-11-23 |
| 037 | [Journal and Audit Tables](feature-specs/03-ledger-core/037-journal-tables.md) | `journal_entry` and `journal_line` with their rules; the audit log is append-only by test | Done | 2026-11-23 |
| 036 | [BAS Labels](feature-specs/03-ledger-core/036-bas-labels.md) | What each line adds to G1, 1A and 1B. Client question 28 raised | Done | 2026-11-23 |
| 035 | [GST Maths](feature-specs/03-ledger-core/035-gst-maths.md) | One eleventh, exact integer rounding, and a search test that no other file does GST | Done | 2026-11-23 |
| 034 | [Tax Codes](feature-specs/03-ledger-core/034-tax-codes.md) | GST, FRE, INP, N-T as data, default codes on the template, ATO sources recorded | Done (defaults awaiting the author's review) | 2026-11-23 |
| 033 | [Manage Accounts Service](feature-specs/03-ledger-core/033-manage-accounts.md) | Add, rename, change code, deactivate, reactivate, each audited. The audit log table was created here | Done | 2026-11-23 |
| 032 | [Accounts and the Default Chart](feature-specs/03-ledger-core/032-accounts.md) | The account table and a 39-account default chart created by setup | Done (template awaiting the author's review) | 2026-11-23 |
| 031 | [Financial Year and BAS Periods](feature-specs/03-ledger-core/031-periods.md) | 1 July year, BAS months and quarters, no `Date` objects | Done | 2026-11-23 |
| 030 | [Business Settings](feature-specs/03-ledger-core/030-business-settings.md) | The business row, ABN check digits, setup that refuses to run twice | Done | 2026-11-23 |
| 028 | [Help: Guide List, Search and Reader](feature-specs/02-demo-1-the-app-opens/028-help-reader.md) | Help grouped by feature, search by any word, a plain reading page with a back button, offline. Fixed: a guide opening scrolled down | Done (Impeccable skill not run) | 2026-11-23 |
| 027 | [Help: Guide Format and the Getting Started Guide](feature-specs/02-demo-1-the-app-opens/027-guide-format.md) | Guides as JSON in `guides/` with a Zod schema, plain text only, a test that every guide and image is valid, and the Getting started guide | Done | 2026-11-23 |
| 026 | [Keyboard, Focus and Mac Menus](feature-specs/02-demo-1-the-app-opens/026-keyboard-and-menus.md) | Mac menus, Command-1 to Command-9, one shortcut list for menu and screens, Tab and focus checked on every page | Done (Impeccable skill not run) | 2026-11-23 |
| 025 | [Every Page With Its Empty State](feature-specs/02-demo-1-the-app-opens/025-empty-pages.md) | Home's Getting started, Settings' status cards with About, every other page's empty state | Done | 2026-11-22 |
| 024 | [App Layout](feature-specs/02-demo-1-the-app-opens/024-app-layout.md) | Glass sidebar, hash router, toolbar, remembered window size and sidebar | Done (author's look pending) | 2026-11-22 |
| 023 | [Feedback Components](feature-specs/02-demo-1-the-app-opens/023-feedback-components.md) | EmptyState, Sheet, ConfirmDialog, ErrorMessage, SampleDataLabel | Done | 2026-11-22 |
| 022 | [Table Component](feature-specs/02-demo-1-the-app-opens/022-table-component.md) | Sort, selection, keyboard, sticky header, skeleton; 500 rows smooth | Done | 2026-11-22 |
| 021 | [Basic Components](feature-specs/02-demo-1-the-app-opens/021-basic-components.md) | Button, Badge, Amount, DateCell, the components page | Done | 2026-11-22 |
| 020 | [Design Tokens](feature-specs/02-demo-1-the-app-opens/020-design-tokens.md) | `tokens.css`, light and dark, contrast measured, Lucide icons | Done (author's look at the preview pending) | 2026-11-22 |
| W11 | [Wireframe Sign-Off](feature-specs/W-wireframes/W11-wireframe-sign-off.md) | The client's choice per screen written into `ui-context.md`, `decisions/wireframe-sign-off.md` | Done (reported by the author) | 2026-11-22 |
| W10 | [Client Review Pack](feature-specs/W-wireframes/W10-client-review-pack.md) | The client reviewed the wireframes | Done (reported by the author) | 2026-11-22 |
| 019 | [Skill: React Renderer](feature-specs/01-agent-skills/019-skill-react.md) | Screens: data through the bridge, `Result`, every state, where the look comes from | Done | 2026-11-22 |
| 018 | [Skill: Australian Bookkeeping Rules](feature-specs/01-agent-skills/018-skill-bookkeeping.md) | Signed-cents double entry with 5 worked examples, GST, simpler BAS, periods, cash or accruals, each fact with its ATO page | Done (ATO pages read through search results; confirm in a browser) | 2026-11-22 |
| 017 | [Skill: SQLite and Migrations](feature-specs/01-agent-skills/017-skill-sqlite.md) | Adding a table, column rules, repositories, transactions. Also made the migration tests hold for any number of real migrations | Done | 2026-11-22 |
| 016 | [Skill: Electron](feature-specs/01-agent-skills/016-skill-electron.md) | The settings that stay on, adding a bridge function, build and packaging | Done | 2026-11-22 |
| 015 | [Skills Index and the Kit's Workflow Skills](feature-specs/01-agent-skills/015-skills-index.md) | `next-spec`, `new-spec`, `check-invariants`, `done-check`, adapted to this project | Done (new-session check for the author) | 2026-11-22 |
| 014 | [Package Contents Check and First End-to-End Test](feature-specs/00-foundations/014-package-checks.md) | Fails the package on private or development files; Playwright tests the packaged app in self-check mode | Done (self-check mode replaces direct Playwright control) | 2026-11-22 |
| 013 | [Packaged Mac App and Fuses](feature-specs/00-foundations/013-package-app.md) | Ad-hoc signed arm64 `.app`, 6 fuses changed, debugging refused, 266 MB | Implemented, Finder look by the author pending | 2026-11-22 |
| 012 | [Pre-Migration Copy and Integrity Check](feature-specs/00-foundations/012-migration-safety.md) | `VACUUM INTO` copy before migrating, last 5 kept; `integrity_check` on every open | Done | 2026-11-22 |
| 011 | [SQLite Store and Migration Runner](feature-specs/00-foundations/011-sqlite-store.md) | `books.db`, hashed migrations, `createTestDatabase()`, `app.getDataStatus` | Done | 2026-11-22 |
| 010 | [App Name, Data Folders and Log File](feature-specs/00-foundations/010-data-folders.md) | ` Dev` name and folder for every unpackaged run, quit on close, rotating log | Done | 2026-11-22 |
| 009 | [Bridge Contract and the First Bridge Function](feature-specs/00-foundations/009-bridge-contract.md) | `window.bridge`, sender and Zod checks in main, `app.getInfo` | Done | 2026-11-22 |
| 008 | [Hardened Electron Window](feature-specs/00-foundations/008-electron-window.md) | Sandboxed window, `app://` scheme, CSP, permissions denied, single instance | Done | 2026-11-22 |
| 007 | [Ids, Logger and Environment](feature-specs/00-foundations/007-ids-logger-env.md) | `newId`, a logger that refuses private fields, `loadEnv` | Done | 2026-11-22 |
| 006 | [Calendar Dates and the Clock](feature-specs/00-foundations/006-dates.md) | `CalendarDate`, day-first parsing, date maths, `Clock`; real clock in `src/main/clock.ts` | Done | 2026-11-22 |
| 005 | [Money in Integer Cents](feature-specs/00-foundations/005-money.md) | `Cents`, `parseCents`, `formatCents`, sums; lint ban on `parseFloat` and `toFixed` | Done | 2026-11-22 |
| 004 | [Result Type and Literal Kinds](feature-specs/00-foundations/004-result-and-kinds.md) | `Result`, `AccountType`, `assertNever` | Done | 2026-11-22 |
| 003 | [Import Boundary and Purity Lint Rules](feature-specs/00-foundations/003-boundary-rules.md) | Allowed import directions and pure `domain` and `import`, as lint errors | Done | 2026-11-22 |
| 002 | [Folder Skeleton and Path Aliases](feature-specs/00-foundations/002-folder-skeleton.md) | The ten `src/` folders and `@shared/*` style aliases | Done | 2026-11-22 |
| 001 | [Initialize the Repository and Tooling](feature-specs/00-foundations/001-init-repo.md) | Pinned tooling, scripts, `.gitignore`; versions checked | Done | 2026-11-22 |
| W01b | [Skill: UI UX Pro Max](feature-specs/W-wireframes/W01b-skill-ui-ux-pro-max.md) | Second UI skill, installed from commit `2de1134` | Done | 2026-11-22 |
| W01a | [Skill: Impeccable](feature-specs/W-wireframes/W01a-skill-impeccable.md) | Main UI skill, installed from commit `b49177d`, with `PRODUCT.md` and `DESIGN.md` | Implemented, new-session check deferred | 2026-11-22 |

## Follow-ups

Things found during work that are not part of the current spec. Each has an owner and a due point.

| Item | Found in | Due before | Status |
|---|---|---|---|
| Review `decisions/ui-and-wireframe-skills.md` | Planning | W01 | Open |
| Get QuickBooks sample company screenshots, or blurred real ones, for W02 | Planning | A W redo, if the client wants screens closer to QuickBooks | Open (W02 went ahead without them) |
| Keep `references/imagesforaccountant/` (20 unblurred screenshots of his live QuickBooks) out of git, or move it outside the project (risk K3) | 2026-11-22 references | The first commit | `.gitignore` ignores `/references/` (spec 001). The author checks `git status` before the first commit |
| Check inside Electron at spec 008: the binary downloads and runs on Apple silicon, `formatCents(-123450)` gives `-$1,234.50`, and `systemClock.today()` gives the local date | 001, 005, 006 | Spec 008 | Done 2026-11-22 (008) |
| Prove better-sqlite3 13.2.0's shipped arm64 prebuild loads in Electron 45 with no rebuild | 001 | Spec 011 | Done 2026-11-22 (011) |
| Decide the final product name and app id. "Accounting Books" and `app.accountingbooks.desktop` are placeholders. They set the data folder and Keychain access, so they must not change after go-live | 010, 013 | Folder 12 | Open |
| **Review the sample books' choices:** the two bank accounts' names, the 25 contacts, that Home's numbers open Accounts for now, that a credit shows with a minus sign (client question 29), and that Home's To do box is empty in Demo 2 | 046, 048, 049, 050 | Demo 2 (spec 054) | Open, for the author |
| Hold Demo 2 with `context/demo-scripts/demo-2-the-sample-book.md`, and write what the client says in `demo-feedback.md` | 054 | Folder 05 | Open, for the author |
| Run Impeccable `critique`, `audit` and `polish` (the skill) on Home, Accounts, Transactions, the panel and the choice screen | 048 to 052 | Demo 2 | Open, for the author |
| Retake the four guide images (`guides/images/`) whenever Home, Accounts or Transactions change, or the sample books do. They show 23 November 2026 | 053 | Each change | Open |
| Folder 06 must know which account is the GST account when it posts a bank line: today the sample builder finds it by its code in the default chart, and nothing stores it | 046 | Spec 068 | Open |
| The Developer card and the first-launch choice must be gone in the build for the client: set `SAMPLE_DATA_SWITCH` to false in `src/main/build-flags.ts` and test it (spec 150) | 047 | Folder 12 | Open |
| Review the default chart of accounts (`src/domain/chart-template.ts`) and its default GST codes (`defaultTax`): in particular Bank fees, Interest paid and Interest income as input taxed, and Suspense as a liability. Then the accountant confirms them | 032, 034 | Demo 2 (spec 054) | Open, for the author |
| Confirm the spec 040 decision: a posted entry is changed or removed in place with the full history in the audit log (adopted on the spec's recommendation). The alternative is reversing entries only | 040 | Folder 06 (To review undo) | Open, for the author |
| Read the ATO pages for the GST on selling a business asset (client question 28), and for credits on purchases that relate to input-taxed income, before the BAS worksheet | 036, 034 | Spec 094 | Open |
| Make the entry builders (bank line posting, folder 06) put the GST on the GST account as `validateEntry`'s header describes, and consider checking it in `validateEntry` | 038 | Spec 068 | Open |
| Spec 029 (Demo 1): run the checks, Impeccable polish, write the demo script and record the client's feedback | 029 | Demo 1 | Skipped at the author's instruction while the ledger core was built |
| Run Impeccable `critique` and `audit` (the skill, not my own review) over the whole app, and read the Help guide for plain wording, before the client sees Demo 1 | 026, 028 | Demo 1 (spec 029) | Open, for the author |
| Update the Getting started guide ("Find your way around", and the sentence about empty pages) whenever a folder fills a page, and remove "Coming in a later version" from it when none are left | 027 | Each folder from 03 | Open |
| Open the packaged app from Finder and confirm the page shows the version (no "development") and "Schema version 1, integrity: ok" | 013 | Demo 1 (spec 029) | Open, for the author |
| `npm audit`: 6 moderate, one `minimatch` advisory inside electron-builder (build time only). Recheck when electron-builder updates | 013 | Folder 12 | Open |
| Open the ATO pages linked in `.claude/skills/au-bookkeeping-rules/SKILL.md` in a browser and confirm each fact (ato.gov.au refuses automated fetches, so they were read through search results) | 018 | Spec 034 | Open, for the author or the accountant |
| Start a new Claude Code session and type "next spec", to see `next-spec` picked up | 015 | Spec 020 | Open, for the author |
| Move to TypeScript 7 once `typescript-eslint` supports it (8.73.0 allows below 6.1) | 001 | When supported | Open |
| npm 12 blocks `fsevents`' install script (an optional file watcher). Approve or deny it by name if it ever matters | 001 | None | Done 2026-11-22: denied in `allowScripts` (011) |
| `books.db` and its WAL files get default permissions (`-rw-r--r--`), readable by other user accounts on the Mac. Decide with encryption at rest | 011 | Folder 12 | Open |
| Decide the Admin Dashboard link (`decisions/admin-dashboard-link.md`), and ask client questions 24 and 25 | 2026-11-22 | Folder 10 | Open |
| Decide whether `wireframe/` goes in git (W01 step 5). Recommended: the HTML yes, `wireframe/brain/` screenshots no | W01 | Spec 001 | Open |
| Check `/wireframe` shows in a new Claude Code session (W01 check) | W01 | Next session | Open |
| Decide whether Impeccable's launcher (a downloaded binary) may run | Planning | Spec 020 | Open |
| Decide the desktop shell | Planning | Spec 001 | Decided 2026-11-22: Electron |
| Decide the storage format and encryption at rest | Planning | Spec 001 (format), folder 12 (encryption) | Format decided 2026-11-22: SQLite. Encryption open |
| Decide the Google Sheets approach | Planning | Folder 09 | Decided 2026-11-22 |
| Ask the client questions 1 to 8 | Planning | Demo 3 (spec 067) | Open |
| Get a Westpac CSV header row, with no transactions (question 16) | Planning | Spec 059 | Open |
| Ask Basiq and Fiskil for a price for one business | Planning | Before scheduling F01 | Open |
| Decide who owns the Apple Developer account and the Google Cloud project (question 14) | Planning | Spec 106 | Open |

## Open Questions

Missing or unclear requirements live in `client-questions.md`, numbered there. Work on the affected part waits until one is answered, or uses the safe assumption written beside it.

## Architecture Decisions

| Date | Decision | Where it is recorded |
|---|---|---|
| 2026-11-21 | A Mac desktop app with local data, for one client first. Scale version later | `decisions/product-shape.md` |
| 2026-11-21 | Bank data from statement files the client downloads from Westpac | `decisions/bank-data-source.md` |
| 2026-11-21 | Wireframes first with Magdoub `wireframe`. Impeccable as main UI skill, UI UX Pro Max second (chosen by Claude as asked, review pending) | `decisions/ui-and-wireframe-skills.md` |
| 2026-11-22 | Desktop shell: Electron | `decisions/desktop-shell.md` |
| 2026-11-22 | Storage: one SQLite file. Encryption at rest still open | `decisions/local-data-storage.md` |
| 2026-11-22 | Google Sheets: own screens and publishing, plus an optional in-app sheet panel, free-form workbook tabs, preview and Ready formulas | `decisions/google-sheets-approach.md` |

## Implementation Notes

Things a newcomer would trip over.

- `context/rules/` holds unchanged copies of the author's kit (`~/Desktop/Claude MD rules/rules folder/`), plus `desktop-app.md`, `client-project.md` and `web-app.md`. Change the kit first, then copy.
- Three outside skills are installed in the project: `wireframe` (W01), `impeccable` (W01a) and `ui-ux-pro-max` (W01b), each with a `SOURCE.md` of its rules. Nothing is installed in `~/.claude/`. Spec 015 adds the kit's skills, with the author's approval.
- The specs were renumbered once on 2026-11-22 into demo folders (`feature-specs/RENUMBERING.md`). The old files are in `context/archive/`, not to be built from.
- The wireframes were filled into the skill's template by a throwaway script in the session scratchpad, not by hand edits, and no colour phase was run. To change one, edit its `index.html` and `styles.css` directly. Rule 6 in the skill's `SOURCE.md` explains the two template changes.
- The kit's `introductions/` folder is unrelated to this project, and was not copied.

## Session Notes

One or two lines per working session, newest first: what was done, what was measured, what was deferred.

- **2026-11-23 (Demo 2, 046 to 054):** Built the sample books and everything to show them: two small tables (contacts and bank accounts, created early), the deterministic Harbour Lane Joinery data set (94 entries on 23 November, solved so the figures match the wireframes exactly), a books session that keeps the sample books in a file of their own, the first-launch choice and the label on every page, Home with its numbers and to-do rules, Accounts, Transactions with filters, paging, search by word or amount, and the history panel, and the guide "Reading your books". 732 unit tests, 2 end-to-end tests (the packaged app now loads and clears the sample data from its own screens) and the package check pass. Run for real: every guide step followed by a script (23 checks), keyboard pass on every new screen, screenshots at 1100 and 1440, light and dark. Found and fixed: a Transactions table that broke words in the middle at 1440 wide, a stray scrollbar on the choice screen, and a race in my own end-to-end script. Decided without the author: the contact and bank account tables created early, a credit shown with a minus sign, the button named "Clear sample data", and Home's numbers opening Accounts. Not done: the demo itself, and Impeccable on the new pages. The author chose to skip the git branch for folder 04.
- **2026-11-23 (ledger core, 030 to 045):** On `feature/03-ledger-core`. Built the whole backend in 16 specs: 5 new migrations (business, accounts, audit log, tax codes, journal), the pure rules (ABN, periods, GST, BAS labels, entry validation, balances), the posting service with change and remove, the guard tests, the launch check on the bridge, and the terminal tool. 534 unit tests, 2 end-to-end tests and the package check pass. Run for real: the built terminal tool, and the packaged app logging `books.checked`. Found and fixed: SQLite refuses DML on a table that points at a table not yet made (so the tax code link is added in 0005), dropping a column and adding it back is the way to add a foreign key, and a spec 012 test that assumed few tables. Decided without the author: the spec 040 recommendation (to confirm), one GST account, the audit log created at 033. Not done: the author's review of the chart and tax defaults.
- **2026-11-23 (Demo 1, 026 to 028):** Built the Mac menu (App, File, Edit, View, Window, Help) and Command-1 to Command-9 from one shortcut list in `src/shared/`, the guide format and the Getting started guide, and the Help page with search and a reader. 354 unit tests and 2 end-to-end tests pass, and the package check passes. Drove the real app with Playwright: menu items and keys open the right pages, Tab reaches every control on all 10 pages with a focus ring, light and dark screenshots at 1100 and 1440 wide. Found and fixed: a guide opened scrolled past its title. The Impeccable skill itself was not run (follow-up).
- **2026-11-22 (Demo 1, 020 to 025):** The client's sign-off recorded (W11, recommended options). Built the tokens (contrast measured), the components (Button, Badge, Amount, DateCell, Table, EmptyState, Sheet, ConfirmDialog, ErrorMessage, SampleDataLabel), the app layout and every page. 289 unit tests and 2 end-to-end tests pass. Impeccable reviewed each step single-context (no launcher): no P0 or P1. Fixed: the UI UX Pro Max cache rule, the dark sheet backdrop, the Settings order.
- **2026-11-22 (agent skills 015 to 019):** On `feature/01-agent-skills`. Extended the W11 gate exception to folder 01 at the author's request. Adapted the kit's four workflow skills and wrote four technology skills, each checked by following it: a throwaway bridge function, a throwaway migration and repository, examples summed by script, ATO facts via search (ato.gov.au gives 403 to fetches), and an inline-style test in the built app. Following the SQLite skill found that 14 migration tests from 011 and 012 assumed schema version 1. Fixed: they now follow the real migration list. Added client question 27 (invoice GST rounding).
- **2026-11-22 (foundations 007 to 014):** Built ids, the logger and env checks, the hardened Electron window on a private `app://` scheme, the bridge, the ` Dev` data folder and log file, the SQLite store with hashed migrations, the pre-migration copy and integrity check, the packaged app with fuses, and the package contents check with an end-to-end test. 225 unit tests and 2 end-to-end tests pass. Found and fixed: VS Code's `ELECTRON_RUN_AS_NODE=1`, an ESM preload that would need the sandbox off, a self-check refusal that wrote to the real data folder. Stopped before folder 01 for its branch.
- **2026-11-22 (foundations 001 to 006):** The author ran `git init` and created `feature/00-foundations`. Checked current versions (Electron 45.4.1, TypeScript 6.0.3 because `typescript-eslint` does not yet support 7, Vitest 5.1.1, ESLint 10.15.0) and chose electron-vite. Built tooling, folders, boundary and purity lint, `Result`, kinds, money and dates. 130 tests pass. Each lint rule was proved with throwaway files. Nothing committed. Electron itself not yet run (008).

- **2026-11-22 (restructure):** At the author's request, rewrote every spec as 151 small specs in 13 folders, so the client sees the app in 9 demos with invented sample data. Archived the old specs, wrote `RENUMBERING.md`, `demo-feedback.md`, and updated references in every context file. Installed Impeccable (W01a) and UI UX Pro Max (W01b), wrote `PRODUCT.md` and `DESIGN.md`, and added "How Screens Are Made" to `ui-context.md`.

- **2026-11-22 (QuickBooks references):** Read the author's 20 QuickBooks screenshots for structure. Updated To review Option 1, added W05a (rules), W05b (transactions and accounts), W08a (invoices from the Admin Dashboard), the open decision `admin-dashboard-link.md`, client questions 24 and 25, notes on questions 1 and 4, and widened risk K3 to cover `references/`.

- **2026-11-22 (sheets and help):** The author decided the Google Sheets approach (B plus an optional in-app panel, free-form workbook, preview, Ready formulas). Added wireframes W06a, W07a, W09a to the client pack, build-spec titles 023a, 023b, 036a, 041a to 041c, 044a, risk G7 and client questions 22 and 23. Help follows the Admin Dashboard's pattern.

- **2026-11-22 (future idea wireframes):** At the author's request, added brainstorm specs W12 to W17 and built their wireframes in `wireframe/future/` (6 ideas x 5 options, own index, not in the client pack). F04 has none: no new screens. Added a dated pointer line to each F file. Checked by screenshot, and checked the sample sums (payout, payroll journal, W1 and W2).

- **2026-11-21 (wireframes):** Installed the wireframe skill (W01) and wrote its design context (W02, no screenshots). Built 6 screens x 5 black-and-white options (W03 to W07, W09) and the review pack (W10). Checked each screen by headless screenshot: fixed blue links and checkboxes, a cramped row, a wrapping title, and a profit figure that did not add up. Skipped W08 (question 1). Added client questions 18 to 21.

- **2026-11-21 (later):** Read the wireframe skill candidates and both UI skills in full or in part (see the decision note for what was and was not read). Chose Magdoub `wireframe`, Impeccable as main, UI UX Pro Max second. Added phase W (W01 to W11) before code, specs W01a and W01b, and an "Adding New Work" rule. Nothing installed.
- **2026-11-21:** Researched QuickBooks AU, Westpac, Open Banking and Google Sheets (`research-notes.md`). The author decided: Mac desktop app, local data, one client first, Westpac files for bank data. Wrote `CLAUDE.md` and the `context/` folder from the author's kit, with full specs for folders 00 to 03. Nothing committed, no code written, nothing installed.
