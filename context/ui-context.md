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

Light and dark. The app follows the system setting until the client picks one in Settings, and remembers the choice. Tokens are defined once in `src/renderer/styles/tokens.css`. Components use the tokens. No hardcoded colour values in components.

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

**Contrast.** Measured for the kit on 2026-11-16. Every text pair above passes 4.5:1 in both themes. The lowest were muted text on surface (6.08) and warning text on surface (5.02 light). If any value changes, measure again and record the new ratios here. Text on the sidebar glass must also pass over the lightest and darkest parts of whatever sits behind it.

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
- **Sidebar** (glass, 232 wide, collapsible): Home, To review (with a count), Bank, Transactions, Accounts, Reports, Invoices, Bills, Contacts, Shared sheets, Accountant changes (with a count). Settings and Help at the bottom. Invoices, Bills and Contacts show only once folder 10 is built.
- **Content:** 24 to 32 page padding, solid surfaces, at most one level of card. Wide tables scroll inside their own container, never the page.
- **Toolbar** at the top of each page: the title on the left, the page's actions on the right, with the one main action in the accent colour.

## Screens

Each screen is written in full by the spec that builds it. Order follows the delivery order.

### Home

A connection or backup warning, only when something is wrong. Four summary numbers: bank balance, lines to review, GST owing for the current period, and profit this financial year. Each links to its page. Then recent imports and the next BAS due date.

### Bank (folder 05)

One row per bank account: name, last four digits, balance in the app, last statement balance, and reconciliation status. The main action is **Import file**. A drop zone takes a file dragged onto the window.

### Import preview (folder 05)

A sheet over the Bank page. The file name, account, period, and counts of new, duplicate and rejected lines. A closing balance check, marked pass or warning. A table of the lines. Rejected rows show their reason. **Import** and **Cancel**.

### To review (folder 06)

The spreadsheet-style screen the client spends most time in. One row per bank line: date, description, amount, suggested account, GST code, and an accept control. Keyboard first: arrow keys move, Enter accepts, typing searches accounts. Split and transfer open a small sheet.

### Transactions and Accounts (folders 04 and 07)

Transactions: every journal entry, filterable by date, account and source, with its history. Accounts: the chart of accounts, grouped by type, with balances.

### Reports (folder 08)

A list of reports: profit and loss, balance sheet, trial balance, BAS worksheet. Each report has a date range picker, and the actions Export CSV, Export PDF and Publish to Google Sheets. Every figure links to the lines behind it.

### Shared sheets and Accountant changes (folder 09)

Shared sheets: each published sheet with its report, period, last published time, who it is shared with and at what role. Actions: Open in Google Sheets, Publish again, Share, Stop sharing. Accountant changes: each waiting change with the sheet, the row, the old and new values, and Accept or Reject.

### Settings

One section per area: Business (name, ABN, GST basis, BAS frequency, financial year), Bank accounts, Google (connected account, Connect or Disconnect), Backups (folder 11), Appearance, and About.

### Help

Searchable guides from `guides/`, grouped by feature, in a solid reading view. Works offline.

## Component Library

- Decided at specs 020 and 021. Options: a headless kit restyled with these tokens, or a small set of the project's own components. Kit files, if any, are not edited. They are restyled through tokens.
- One stroke icon set, chosen and recorded at spec 020 with its licence. Sizes: 16 inline, 20 in buttons and the sidebar, 32 in empty states.
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
