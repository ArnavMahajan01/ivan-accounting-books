Generated for wireframes. `context/ui-context.md` wins wherever they differ.

# Design Context: Accounting Books

Generated: 21/11/2026, by hand from `context/project-overview.md`, `context/ui-context.md` and `context/research-notes.md`. There is no app code yet, and no screenshots were supplied (W02 step 2), so there are no Screenshot Observations.

## App Overview

A private bookkeeping app for the Mac, for one Australian small business owner leaving QuickBooks Online. He imports Westpac statement files (OFX or CSV), gives each bank line an account and a GST code, reconciles, runs reports and a BAS worksheet, and publishes chosen reports to Google Sheets that he shares with his accountant. The app's file on his Mac is the truth. Sheets are copies, and an accountant's edit comes back as a proposal he accepts or rejects.

## Target Platform

Desktop. A native-feeling Mac window, minimum 1100 by 700, also used at 1440 wide and full screen on 27 inches. Not a website and not responsive to phones.

## Layout Patterns

- Left sidebar (232 wide, collapsible), content to the right.
- Each page has a toolbar: title on the left, actions on the right, one main action.
- Content on solid surfaces, at most one level of card. Data-dense tables that scroll inside their own container.
- Sheets (Mac-style panels sliding down over the page) for import preview, split, transfer, share and confirmations.
- Light theme first in the wireframes. Dark follows the system later.

## Navigation

- Sidebar, top: Home, To review (count), Bank, Transactions, Accounts, Reports, Shared sheets, Accountant changes (count).
- Sidebar, bottom: Settings, Help.
- Invoices, Bills and Contacts appear only if client question 1 says he uses them (folder 10). They are left out of these wireframes.
- Standard Mac menus and keyboard shortcuts. No mobile nav.

## Page Types

### Home
- Structure: warnings (only when something is wrong), four summary numbers, recent imports, next BAS due date.
- Key elements: bank balance, lines to review, GST owing this period, profit this financial year. Each links to its page.

### Lists and tables (Bank, Transactions, Accounts, Shared sheets)
- Structure: toolbar, filters, a table.
- Key elements: right-aligned amounts with tabular figures, status in words.

### Work queue (To review, Accountant changes)
- Structure: a list of items waiting for a decision, each with an accept and a change action.
- Key elements: keyboard first (arrow keys, Enter accepts, typing searches accounts).

### Report (Profit and loss, BAS worksheet)
- Structure: period picker, report body, actions Export CSV, Export PDF, Publish to Google Sheets.
- Key elements: every figure opens the lines behind it. The BAS worksheet shows G1, 1A, 1B and a period lock.

### Settings
- Structure: one section per area: Business, Bank accounts, Google, Backups, Appearance, About.

## Interaction Patterns

- Drag a file onto the window, or click **Import file**.
- Preview before saving anything. Confirm or undo for destructive actions.
- Nothing from Google changes the books until accepted.

## Content Hierarchy

- Page title 24, section heading 16, body and amounts 14, labels 13, column headers 12.
- Tables over cards. Cards only for the Home summary numbers.

## Screenshot Observations

Added 2026-11-22 from the author's 20 screenshots of the client's QuickBooks (`references/imagesforaccountant/`). Structure only: no name, number or amount from them is used anywhere.

### Bank transactions (For review)
- One table: date, bank description, Spent, Received, attachment, comment, GST, From/To (payee), Match or Categorise, Post.
- Transfers between his own accounts show as a pair.

### Rules
- An ordered list: priority, name, accounts, conditions, settings, posts by itself, status.
- Edit panel: name, money in or out, which accounts, conditions with "add a condition", test, priority, then type, account, split, payee, GST, customer, memo, and posting by itself.

### Lists
- Expense transactions: date, type, number, payee, account changed in the row, before GST, GST, total.
- Chart of accounts: name, type, detail type, GST rate, balance in the books, bank balance, account history.
- Suppliers and Customers: summary bands (unpaid, overdue, paid) above a table with open balances.

### Not used, or empty
- Receipts, bills, recurring transactions, contracts and sales orders were empty in the screenshots.

## UX Conventions

- Australian dates, day first: `21/11/2026`. AUD amounts: `$12,480.50`, negatives with a minus sign: `-$1,240.00`. Never colour alone.
- Financial year 1 July to 30 June. BAS quarters: Jul to Sep, Oct to Dec, Jan to Mar, Apr to Jun.
- GST codes: GST (10%), GST free, Input taxed, BAS excluded.
- Invented sample business: Harbour Lane Joinery Pty Ltd, Westpac Business One ending 4821 and Westpac Business Cash Reserve ending 7730. Accountant: `accountant@example.com`. Every screen shows "Sample data".
- No wording that suggests the app lodges with the ATO.
- No hero banners, centred marketing layouts or hover-only actions.
