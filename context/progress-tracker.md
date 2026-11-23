# Progress Tracker

Update this file whenever the current phase, the active spec or the implementation state changes.

**How to record a finished spec:** write `context/progress/<spec file name>.md` from `context/progress/PROGRESS-TEMPLATE.md` (what was done, how it was verified, notes), then add a row to **Completed**, and refresh **Next Up**. Keep details in the progress file, not here.

## Current Phase

- **Folder 00, foundations (2026-11-22): done.** Specs 001 to 014 on branch `feature/00-foundations`. The author committed 001 to 006. 007 to 014 are not committed yet. The packaged Mac app builds, passes the package contents check and its end-to-end test, and opens empty books at schema version 1. The author allowed folder 00 to start before wireframe sign-off. Screens (spec 020 onward) still wait for W11.
- **Folder 01, agent skills (2026-11-22): done.** Specs 015 to 019 on branch `feature/01-agent-skills`, not committed yet. Eleven skills in `.claude/skills/`: the three UI and wireframe skills, the kit's four workflow skills, and four technology skills (Electron, SQLite and migrations, Australian bookkeeping rules, React renderer).
- **Folder 02, Demo 1 (2026-11-22): started** on branch `feature/02-demo-1-the-app-opens`. The first folder with screens. Specs 020 to 028 are built (tokens, components, layout, every page, Mac menus and shortcuts, the guide format with Getting started, the Help reader). Only 029, the demo itself, is left.
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
| 029 | [Demo 1: The App Opens](feature-specs/02-demo-1-the-app-opens/029-demo-1.md) | 02 |
| 030 | [Business Settings](feature-specs/03-ledger-core/030-business-settings.md) | 03 |
| 031 | [Periods](feature-specs/03-ledger-core/031-periods.md) | 03 |
| 032 | [Accounts](feature-specs/03-ledger-core/032-accounts.md) | 03 |

After folder 00: the first client demo is spec 029 (Demo 1: the app opens). Demos follow at 054, 067, 077, 088, 104, 121, 131 and 141, then go-live at 151.

## Completed

Newest first.

| # | Spec | What it does | Status | Date |
|---|---|---|---|---|
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
