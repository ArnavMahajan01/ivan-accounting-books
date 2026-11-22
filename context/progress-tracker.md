# Progress Tracker

Update this file whenever the current phase, the active spec or the implementation state changes.

**How to record a finished spec:** write `context/progress/<spec file name>.md` from `context/progress/PROGRESS-TEMPLATE.md` (what was done, how it was verified, notes), then add a row to **Completed**, and refresh **Next Up**. Keep details in the progress file, not here.

## Current Phase

- **Folder 00, foundations (2026-11-22):** specs 001 to 006 are done on branch `feature/00-foundations` (tooling, folders and aliases, boundary lint, `Result` and kinds, money, dates and the clock). Nothing is committed. The author allowed folder 00 to start before wireframe sign-off. Screens (spec 020 onward) still wait for W11.
- **Phase W, wireframes (2026-11-21):** the wireframes wait for the author to click through them, then for the meeting with the client (W10) and sign-off (W11).

## Current Goal

- The author clicks through every option in `wireframe/index.html`, then walks the client through them and fills in `context/wireframe-feedback.md` (W10). Redos become new W specs. W11 records the sign-off before any code.
- Meanwhile, the two open decisions are made (`decisions/desktop-shell.md`, `decisions/local-data-storage.md`), so spec 001 can start once W11 is done.
- The author asks the client the questions in `client-questions.md`, starting with 1 to 8 and 18 to 21. Question 1 decides whether W08 is needed.

## How To Run

- Wireframes: open `wireframe/index.html` in a browser. No build step.
- Code checks: `npm install`, then `npm run check` (typecheck, lint, test). The full list is in `CLAUDE.md` section 4. There is no app window yet (spec 008).

## In Progress

| # | Spec | State |
|---|---|---|
| W01 | [Skill: Wireframe](feature-specs/W-wireframes/W01-skill-wireframe.md) | Installed, byte for byte from commit `44a5814`. Not yet checked: `/wireframe` showing in a new session. Step 5 (git) waits for the author |
| W02 | [Wireframe Design Context](feature-specs/W-wireframes/W02-wireframe-design-context.md) | Written from the context files. No screenshots were supplied, so there are none to check |
| W03 to W07, W09 | Six screen wireframes | Built, 5 options each, checked by screenshot. Waiting for the author to click through all options. Options and recommendations are listed in `wireframe-feedback.md` |
| W08 | [Wireframe: Invoices and Bills](feature-specs/W-wireframes/W08-wireframe-invoices-and-bills.md) | Not started. Waits for client question 1 |
| W10 | [Client Review Pack](feature-specs/W-wireframes/W10-client-review-pack.md) | `wireframe/index.html` and `wireframe-feedback.md` written. Waiting for the client meeting |
| W06a, W07a, W09a | Customise a report, working with the Google Sheet, Help and guides | Built, 5 options each, added to the client review pack. Waiting for the author's click-through |
| W08b | Contacts: saved automatically, a page for each with invoices and payments, merging duplicates | Built, added to the client pack. Waiting for the author's click-through |
| W05a, W05b, W08a | Bank rules, transactions and accounts, invoices from the Admin Dashboard. W05 Option 1 updated | Built from the author's QuickBooks screenshots (structure only), added to the client pack. Waiting for the author's click-through |
| W12 to W17 | Brainstorm wireframes of future ideas F01, F02, F03, F05, F06, F07 | Built in `wireframe/future/`, 5 options each, checked by screenshot. Waiting for the author's click-through. Do not gate W11 or 001 |

## Next Up

The next five specs.

| # | Spec | Phase |
|---|---|---|
| W10 | [Client Review Pack](feature-specs/W-wireframes/W10-client-review-pack.md): the meeting | W |
| W08 | [Wireframe: Invoices and Bills](feature-specs/W-wireframes/W08-wireframe-invoices-and-bills.md), if question 1 says so | W |
| W11 | [Wireframe Sign-Off](feature-specs/W-wireframes/W11-wireframe-sign-off.md) | W |
| 007 | [Ids, Logger and Environment](feature-specs/00-foundations/007-ids-logger-env.md) | 00 |
| 008 | [Hardened Electron Window](feature-specs/00-foundations/008-electron-window.md) | 00 |

After folder 00: the first client demo is spec 029 (Demo 1: the app opens). Demos follow at 054, 067, 077, 088, 104, 121, 131 and 141, then go-live at 151.

## Completed

Newest first.

| # | Spec | What it does | Status | Date |
|---|---|---|---|---|
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
| Check inside Electron at spec 008: the binary downloads and runs on Apple silicon, `formatCents(-123450)` gives `-$1,234.50`, and `systemClock.today()` gives the local date | 001, 005, 006 | Spec 008 | Open |
| Prove better-sqlite3 13.2.0's shipped arm64 prebuild loads in Electron 45 with no rebuild | 001 | Spec 011 | Open |
| Move to TypeScript 7 once `typescript-eslint` supports it (8.73.0 allows below 6.1) | 001 | When supported | Open |
| npm 12 blocks `fsevents`' install script (an optional file watcher). Approve or deny it by name if it ever matters | 001 | None | Open |
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

- **2026-11-22 (foundations 001 to 006):** The author ran `git init` and created `feature/00-foundations`. Checked current versions (Electron 45.4.1, TypeScript 6.0.3 because `typescript-eslint` does not yet support 7, Vitest 5.1.1, ESLint 10.15.0) and chose electron-vite. Built tooling, folders, boundary and purity lint, `Result`, kinds, money and dates. 130 tests pass. Each lint rule was proved with throwaway files. Nothing committed. Electron itself not yet run (008).

- **2026-11-22 (restructure):** At the author's request, rewrote every spec as 151 small specs in 13 folders, so the client sees the app in 9 demos with invented sample data. Archived the old specs, wrote `RENUMBERING.md`, `demo-feedback.md`, and updated references in every context file. Installed Impeccable (W01a) and UI UX Pro Max (W01b), wrote `PRODUCT.md` and `DESIGN.md`, and added "How Screens Are Made" to `ui-context.md`.

- **2026-11-22 (QuickBooks references):** Read the author's 20 QuickBooks screenshots for structure. Updated To review Option 1, added W05a (rules), W05b (transactions and accounts), W08a (invoices from the Admin Dashboard), the open decision `admin-dashboard-link.md`, client questions 24 and 25, notes on questions 1 and 4, and widened risk K3 to cover `references/`.

- **2026-11-22 (sheets and help):** The author decided the Google Sheets approach (B plus an optional in-app panel, free-form workbook, preview, Ready formulas). Added wireframes W06a, W07a, W09a to the client pack, build-spec titles 023a, 023b, 036a, 041a to 041c, 044a, risk G7 and client questions 22 and 23. Help follows the Admin Dashboard's pattern.

- **2026-11-22 (future idea wireframes):** At the author's request, added brainstorm specs W12 to W17 and built their wireframes in `wireframe/future/` (6 ideas x 5 options, own index, not in the client pack). F04 has none: no new screens. Added a dated pointer line to each F file. Checked by screenshot, and checked the sample sums (payout, payroll journal, W1 and W2).

- **2026-11-21 (wireframes):** Installed the wireframe skill (W01) and wrote its design context (W02, no screenshots). Built 6 screens x 5 black-and-white options (W03 to W07, W09) and the review pack (W10). Checked each screen by headless screenshot: fixed blue links and checkboxes, a cramped row, a wrapping title, and a profit figure that did not add up. Skipped W08 (question 1). Added client questions 18 to 21.

- **2026-11-21 (later):** Read the wireframe skill candidates and both UI skills in full or in part (see the decision note for what was and was not read). Chose Magdoub `wireframe`, Impeccable as main, UI UX Pro Max second. Added phase W (W01 to W11) before code, specs W01a and W01b, and an "Adding New Work" rule. Nothing installed.
- **2026-11-21:** Researched QuickBooks AU, Westpac, Open Banking and Google Sheets (`research-notes.md`). The author decided: Mac desktop app, local data, one client first, Westpac files for bank data. Wrote `CLAUDE.md` and the `context/` folder from the author's kit, with full specs for folders 00 to 03. Nothing committed, no code written, nothing installed.
