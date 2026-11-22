# UI Context

A calm, Mac-native accounting app: a left sidebar, solid surfaces for every table and form, and numbers that are easy to scan. It should feel closer to a well-made Mac app than to a web dashboard, and be easier to read than QuickBooks.

**Status:** a starting point, written on 2026-11-21 from the kit's `glass-dashboard.md`, whose colours had measured contrast on 2026-11-16. Glass is used only for the sidebar. The screen layouts come from the client's signed-off wireframes (W11), which rewrite the Screens section below. The brand and accent colours and the app name are confirmed at spec 020, with candidates from UI UX Pro Max and a critique from Impeccable. Until then, treat every value as a default. This file outranks both skills and the wireframe skill's `design-context.md`.

## References

On 2026-11-22 the author added 20 screenshots of the client's QuickBooks to `references/imagesforaccountant/`. They show real client data, so they are used for structure only, are never copied into wireframes, specs or code, and must stay out of git (risk K3). Further screenshots go in the same place and follow the same rules. They show where things sit, not how they look. This file wins if they disagree.

## Principles

1. **Numbers first.** Amounts are the content. They are right-aligned, in tabular figures, and never squeezed or wrapped.
2. **Nothing is lost by accident.** Every change can be seen, and destructive actions confirm or undo.
3. **Calm.** Colour means something. Motion answers an action and never runs by itself.
4. **Mac-like.** System font, sidebar navigation, keyboard shortcuts, standard menus, follows the system theme.

## How Screens Are Made

Added 2026-11-22. Every screen is built and checked this way, so the app keeps one look and never gets the generic AI look.

1. **Start from the signed-off wireframe** for that screen (`wireframe/`, chosen options in `wireframe-feedback.md`). The layout comes from there, the look from this file.
2. **Build with the tokens and shared components** in this file. No raw values.
3. **Use the UI skills** (`.claude/skills/`, rules in each `SOURCE.md`):
   - **Impeccable** is the main UI skill, in Operate mode. Run `critique` and `audit` on every new or changed screen before its spec is done, and fix P0 and P1 findings. Run `polish` on a folder's screens before its demo. Use `layout`, `typeset`, `quieter`, `clarify` or `harden` when a screen needs it. Its launcher is not run: read `PRODUCT.md` and `DESIGN.md` instead.
   - **UI UX Pro Max** is the second skill, a local reference: candidate palettes and type at spec 020, and its UX guidelines for tables, forms and charts. Suggestions only, written into this file before use.
   - Order of authority: the author, then this file, then Impeccable, then UI UX Pro Max, then the wireframe taste file.
4. **Look at the result** in light and dark, at 1100 by 700 and 1440 wide, by keyboard only, with sample data and with empty data.
5. **Keep `DESIGN.md` and `PRODUCT.md` in step.** When this file or `project-overview.md` changes, update those two thin summaries by hand in the same change. Never let Impeccable's `init` or `document` write them.

## Theme

Light and dark. The app follows the system setting until the client picks one in Settings, and remembers the choice (Settings sets `data-theme` on the page). Tokens are defined once in `src/renderer/styles/tokens.css`: colours, type, spacing, radius, sizes and motion. Components use the tokens. No raw colour value anywhere else in `src/renderer/`, which a test checks (`tools/no-raw-colours.test.ts`). `tools/token-preview.html` shows every token (add `?theme=dark`).

### Light

| Role | Token | Value |
|---|---|---|
| App background | `--color-background` | `#D7E6EA` |
| Solid surface | `--color-surface` | `#FFFFFF` |
| Secondary surface (table header, zebra row) | `--color-surface-secondary` | `#F2F7F8` |
| Sidebar glass fill | `--color-glass` | `rgb(255 255 255 / 0.70)` |
| Sidebar glass border | `--color-glass-border` | `rgb(255 255 255 / 0.55)` |
| Border | `--color-border` | `#CFDDE1` |
| Primary text | `--color-text-primary` | `#10212B` |
| Secondary text | `--color-text-secondary` | `#40535C` |
| Muted text | `--color-text-muted` | `#53656E` |
| Brand | `--color-brand` | `#0F5E6E` |
| Text on brand | `--color-on-brand` | `#FFFFFF` |
| Accent (the one main action) | `--color-accent` | `#FF7A59` |
| Text on accent | `--color-on-accent` | `#10212B` |
| Success | `--color-success` | `#0F7B55` |
| Warning | `--color-warning` | `#B45309` |
| Error | `--color-error` | `#B3261E` |

### Dark

| Role | Token | Value |
|---|---|---|
| App background | `--color-background` | `#0A1A20` |
| Solid surface | `--color-surface` | `#12242B` |
| Secondary surface | `--color-surface-secondary` | `#1A2F37` |
| Sidebar glass fill | `--color-glass` | `rgb(18 40 47 / 0.60)` |
| Sidebar glass border | `--color-glass-border` | `rgb(255 255 255 / 0.10)` |
| Border | `--color-border` | `#2A424B` |
| Primary text | `--color-text-primary` | `#F1F6F7` |
| Secondary text | `--color-text-secondary` | `#B7C7CC` |
| Muted text | `--color-text-muted` | `#8FA3AA` |
| Brand | `--color-brand` | `#6CCBD9` |
| Text on brand | `--color-on-brand` | `#0A1A20` |
| Accent | `--color-accent` | `#FF8A6B` |
| Text on accent | `--color-on-accent` | `#10212B` |
| Success | `--color-success` | `#4CC38A` |
| Warning | `--color-warning` | `#F0A94B` |
| Error | `--color-error` | `#FF7B72` |

**Confirmed at spec 020 (2026-11-22).** The author chose to keep these values, the recommended palette. UI UX Pro Max was searched for candidates ("calm finance bookkeeping desktop app", "fintech banking dashboard"): a navy and gold "traditional banking" palette, a trust blue and green "personal finance" palette, and a calm cyan "healthcare" palette. They were recorded and not used. Its font suggestions (IBM Plex Sans, Lexend) were not used either, because the system font needs nothing loaded or licensed. To change the palette later, change `src/renderer/styles/tokens.css` and measure again.

**Contrast, measured on 2026-11-22** (WCAG 2 formula, `tokens.css` values). Every text pair passes 4.5:1 in both themes:

| Text | On | Light | Dark |
|---|---|---|---|
| Primary | Background / surface / secondary surface | 12.87 / 16.48 / 15.25 | 16.31 / 14.67 / 12.80 |
| Secondary | Background / surface / secondary surface | 6.28 / 8.05 / 7.45 | 10.20 / 9.18 / 8.01 |
| Muted | Background / surface / secondary surface | 4.75 / 6.08 / 5.63 | 6.76 / 6.08 / 5.30 |
| Primary / secondary / muted | Sidebar glass over the app background | 15.38 / 7.51 / 5.68 | 15.04 / 9.41 / 6.23 |
| Brand (selected item, links) | Surface / secondary surface / glass | 7.38 / 6.83 / 6.89 | 8.52 / 7.43 / 8.73 |
| On brand | Brand | 7.38 | 9.46 |
| On accent | Accent | 6.42 | 7.14 |
| Success / warning / error | Surface | 5.27 / 5.02 / 6.54 | 7.22 / 7.98 / 6.34 |
| Success / warning / error | Secondary surface | 4.88 / 4.65 / 6.05 | 6.30 / 6.96 / 5.53 |

The lowest are muted text on the light background (4.75) and warning text on the light secondary surface (4.65).

**The sidebar glass is drawn over the app's own background colour, never over the desktop** (no window translucency). Over a black desktop the light glass would fail (muted text 2.87), and over a white one the dark glass would fail (muted text 1.59).

### Colour Use

- 60% quiet base (background and surfaces), 30% brand (selected sidebar item, links, selection), 10% accent.
- The accent marks only the single main action in a view, such as **Import file** or **Publish**. Never text, status or decoration.
- Status colours only communicate status.
- Destructive actions use the error colour.
- **Money is never shown by colour alone.** A negative amount has a minus sign. Error colour may be added to an overdue or unbalanced figure, together with a word or an icon.

## Typography

The system font (San Francisco on the Mac). Nothing to load or license. All amounts use tabular figures (`font-variant-numeric: tabular-nums`).

| Element | Size | Weight | Colour token |
|---|---|---|---|
| Page title | 24 | 600 | `text-primary` |
| Summary number (Home) | 28 | 600 | `text-primary` |
| Section heading | 16 | 600 | `text-primary` |
| Body, table cells, amounts | 14 | 400 | `text-primary` |
| Labels and secondary text | 13 | 500 | `text-secondary` |
| Column headers | 12 | 500 | `text-secondary` |
| Captions, timestamps | 12 | 400 | `text-muted` |

## Spacing And Radius

- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Radius: controls 8, cards and tables 12, dialogs and sheets 16, badges full.
- Nested corners match: inner radius equals outer radius minus the padding between them.

## Layout

- **Window:** a minimum of 1100 by 700. The layout must also work at 1440 and at a full 27-inch screen.
- **Sidebar** (glass, 232 wide, collapsible), as in the signed-off wireframes: the business name at the top, then Home, To review (with a count), Bank, Transactions, Accounts, Reports, Shared sheets, Accountant changes (with a count). Settings and Help at the bottom. Rules (folder 07), Invoices and Contacts (folder 10) join the list, after Reports, once their folder is built. Bills waits for client question 1 (W08).
- **Content:** 24 to 32 page padding, solid surfaces, at most one level of card. Wide tables scroll inside their own container, never the page.
- **Toolbar** at the top of each page: the title on the left, the page's actions on the right, with the one main action in the accent colour.

## Screens

Signed off by the client on 2026-11-22 (W11, reported by the author): each screen uses the recommended option in `wireframe-feedback.md`. Each section names the wireframe it comes from, in `wireframe/`. The spec that builds a screen adds its detail here. The look comes from the rest of this file, not from the black-and-white wireframes.

### Home

From `2111-app-shell-and-home/`, Option 2, Next Steps.

- The toolbar's main action is **Import file**.
- **To do:** a short list, one job per row with one button. Examples: review the waiting bank lines, reconcile an account to its statement balance, back up the books, open the next BAS worksheet with its due date. Done items tick off, so Home says when he is up to date. A line under the list says whether any accountant changes are waiting.
- **Numbers:** the four summary numbers in a compact list beside the jobs (bank balance, lines to review, GST owing for the current period, profit this financial year). Each opens its page.
- **Recent imports:** a short dated list (date, account, new and skipped lines).
- **A brand-new book** shows a "Getting started" list instead: business details, bank accounts, the first import ("Download a statement file (OFX or CSV) from Westpac Online Banking, then import it"), and connecting Google ("Only needed when you want to share sheets with your accountant").
- Warnings (an overdue backup, a broken Google connection) appear only when something is wrong.

### Bank and Import preview (folder 05)

From `2111-bank-import/`, Option 5, Plain Summary.

- **The Bank page:** one row per bank account (name, last four digits, balance in the app, last statement balance, reconciliation status). The main action is **Import file**, and a file can be dropped on the window.
- **The import sheet** opens with a few plain sentences about the file, in the order he cares about: which account and period, how many lines are new, how many are skipped as already imported, and what is wrong.
- The closing balance check is marked pass or warning. The table of lines is one click away, closed by default, with rejected rows showing their reason.
- **Import** and **Cancel**.

### To review (folder 06)

From `2111-to-review/`, Option 1, Review Table, with Option 3's "Accept all suggested" button.

- A spreadsheet-style table, keyboard first. Columns: date, description, Spent, Received, From/To (the payee), Match or account, GST, and **Post**. This follows his QuickBooks "For review" tab.
- **Matching or categorising:** a line is either matched to something already in the books (such as an invoice), or given an account. Under it, in small words, it says why.
- **Posting many at once:** tick several lines and post them together. "Post all suggested" posts every line with a suggestion.
- **Transfers and splits:** a transfer is shown as a pair with the line in the other account. **Split…** opens a small sheet.
- Every action has a key, shown at the bottom of the page.

### Bank rules (folder 07)

From `2211-bank-rules/`, Option 1, List and Edit Panel, with Option 2's "Do this every time?".

- **The list:** rules in order, since the order decides which rule wins.
- **The edit panel** has the same fields as his QuickBooks rule panel: name, money in or out, which accounts, conditions, then account, GST, payee, split, and whether it posts by itself. **Test** shows how many lines it would catch before saving.
- **Rules from a line:** after he posts a line in To review, the app offers "Do this every time?" with the rule filled in.

### Transactions and Accounts (folders 04 and 07)

From `2211-transactions-and-accounts/`, Option 1, Tables, with Option 2's history panel and Option 3's "Move to".

- **Transactions:** one table, filtered by kind of transaction and date range, with the account changed right in the row. Clicking a row opens a side panel with the whole entry (debits and credits) and its history. Tick several rows, then **Move to…** another account in one step. Every change is recorded in the history. A line in a locked quarter shows "Locked" and cannot change.
- **Accounts:** the chart of accounts as a table, grouped by type, with balances.

### Invoices and Customers (folder 10)

From `2211-invoices-from-admin-dashboard/`, Option 2, Linked Folder, with Option 3's customer balances and Option 4's payment matching.

- He links a folder once. New invoices issued in the Admin Dashboard then appear here, waiting for one click to bring them into the books.
- **Customers:** open balances, overdue in words (not colour alone), and each customer's invoices.
- **Payments:** in To review, a deposit is matched to its invoice, which marks it paid. **Split across invoices…** shares one deposit across several invoices, or part of one.

### Contacts (folder 10)

From `2211-contacts/`, Option 1, List and Contact Page, with Option 2's saving as you go, Option 3's side panel and Option 5's merging.

- **The list and the contact page:** a list of customers and suppliers, and a page for each with what they owe, every invoice (with its PDF), payments and bank lines.
- **Saved as you go:** a new payee typed in To review is saved at once, with Undo. Typing suggests saved contacts first.
- **Side panel:** clicking a contact's name anywhere opens their summary in a side panel.
- **Merging:** likely duplicates are offered for merging.

### Reports and BAS (folder 08)

From `2111-reports-and-bas/`, Option 3, Quarter Close.

- **The reports list:** profit and loss, balance sheet, trial balance, the BAS worksheet. Each report has a date range, and the actions Export CSV, Export PDF and Publish to Google Sheets. Every figure links to the lines behind it.
- **Closing a quarter:** the BAS is reached through a short checklist. The first steps tick themselves from the books. The BAS worksheet is step 3. The lock is the last step, and asks to confirm.

### Customise a report (folder 08)

From `2211-customise-a-report/`, Option 2, Side Panel, starting from Option 5's ready layouts and saving into Option 4's "My reports".

- He starts from a few ready layouts with plain names.
- The choices sit in a panel beside the report, which changes live as he ticks them. **+ New column…** makes his own column: notes, or a calculation picked from a list.
- Saved layouts appear in "My reports" beside the standard reports, which never change.

### Shared sheets and Accountant changes (folder 09)

From `2111-sharing-with-accountant/`, Option 2, People First, with Option 4's "What accepting does" box.

- **Sharing, per person:** each person who can see something is listed once, with what they can see, their role changed in the row, and one way to stop all their access, with a confirmation. **Share…** at the top shares another sheet.
- **Accountant changes:** grouped by sheet, with accepted and rejected ones listed under each. Before accepting, a box spells out what the change does to accounts, GST, profit and the BAS.

### Working with the Google Sheet (folder 09)

From `2211-working-with-the-google-sheet/`: all five options together, built around Option 3.

- **Before publishing**, a sheet-style preview beside the report shows exactly what Google will get, with its tabs. It says whether a new sheet is made or the same one is updated, and which tabs are left alone.
- **Open in Google Sheets** opens the real sheet in Chrome, and one button places the app and Chrome side by side.
- **Optional in-app panel:** the real sheet in a panel beside the report, switched on or off. If Google does not allow the sign-in there, the panel says so plainly and offers Chrome. The author explains its limits to the client in person. No security warning is shown in the app (the author's decision).
- **Ready formulas:** a tab in every workbook, and the same list in the app.
- **Workbook map:** a page showing which tabs the app fills and which are his.

### Settings

From `2111-settings/`, Option 3, Status Cards.

- One card per area, each saying in one line whether it is fine, with problems summed up at the top and a button to fix them.
- Backups and Google come first. Restore is in the Backups card, with its warning.
- Rarely changed details (Business, Bank accounts) are summaries with a **Change…** button. Also: Appearance and About.

### Help

From `2211-help-and-guides/`, Option 1, Like Admin Dashboard, with Option 2's help button on each page.

- The same Help as his Admin Dashboard: guides from `guides/` grouped by feature, search, stars and his own tags, and a plain reading page. "Keep on screen" turns a guide into a small panel that stays while he moves around. Works offline.
- Every page has a **?** button in its toolbar that opens that page's guide in a side panel.

## Component Library

- Decided at spec 021 (2026-11-22): **the project's own small components**, in `src/renderer/components/`, each with its own CSS file using the tokens. No outside component kit: there are only eight shared components, and a kit would add restyling work and a dependency for little gain.
- The components page shows them all, in development only: `npm run dev`, then go to `#components` (`src/renderer/dev/ComponentsPage.tsx`). It is not in the built app.
- One stroke icon set: **Lucide** (`lucide-react`, ISC licence, 1.77.0 checked on 2026-11-22, React 19 supported), chosen at spec 020 and installed at spec 021. Sizes: 16 inline, 20 in buttons and the sidebar, 32 in empty states.
- Shared components that are never restyled inline: Amount, DateCell, Badge, Button, Table, EmptyState, ConfirmDialog, SampleDataLabel.

## Badges

| Status | Colour |
|---|---|
| To review | Warning |
| Posted | Brand |
| Reconciled | Success |
| Excluded | Muted |
| Duplicate (in a preview) | Muted |
| Rejected (in a preview) | Error |
| Locked period | Muted, with a lock icon |
| Shared as viewer, commenter or editor | Brand, with the role in words |
| Sample data | Warning |

## States

- **Loading:** skeleton rows shaped like the final table. Not a blank screen, and not only a spinner.
- **Empty:** muted text, an icon and the next action. "No bank lines yet. Import a file from Westpac Online Banking."
- **Error:** plain language and a retry. Never raw error text.
- **Offline:** everything works offline except Google. Google actions show "Offline" and wait.
- **Expired Google connection:** a banner linking to Settings.
- **Destructive actions:** a confirmation that says what will change, or an undo.
- **Sample data:** a visible "Sample data" label on every screen showing it, until real data is connected at go-live.

## Motion

- About 0.2 seconds, ease-out, only in answer to an action: a sheet rising, a row leaving To review, a count changing.
- Nothing loops. Reports, exports and anything printed are never animated.
- Reduced motion removes movement and keeps simple fades.

## Accessibility

- Every control is keyboard-reachable, with a visible focus ring and an accessible name.
- Never use colour alone to convey meaning, including for negative amounts.
- Text scales without clipping. Amount columns grow rather than truncate.
- Dialogs trap focus, close on Escape, and return focus.

## Do Nots

- No glass behind tables, forms or reports.
- No accent colour except on the single main action.
- No coloured card backgrounds.
- No red-only or green-only amounts.
- No raw colour values in components.
- No emoji as icons.
- No unlabelled sample data.
- No web-page look: no hero banners, no centred marketing layouts, no hover-only actions.
