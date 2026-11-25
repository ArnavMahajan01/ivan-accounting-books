# Client Questions

Everything the client has not confirmed. Work continues using the assumption listed. When a question is answered, update the row, then update any context file or spec the answer changes.

**Status values:** `Open`, `Likely` (reported by the author, not yet confirmed by the client), `Answered`, `Assumption confirmed`.

Rules:

- Every row has a safe assumption. If no safe assumption exists, the affected work stops until the answer comes.
- Record who said what, and the date: "reported by the author on 2026-11-21".
- Never delete a row. Change its status.
- Number rows once, and never renumber. Other files point to these numbers.
- Never write the client's real figures, account numbers or names here. Write the kind of answer only ("a company", "quarterly").

## Already Reported By The Author

Recorded so the source is clear. Each is `Likely` until the client confirms it.

| # | What was reported | Reported | Status |
|---|---|---|---|
| R1 | The client wants to leave QuickBooks Online for his own app | 2026-11-21 | Likely |
| R2 | He pays about AUD 90 a month for QuickBooks and uses many of its features | 2026-11-21 | Likely |
| R3 | He uses a Mac, and has his own Google Workspace | 2026-11-21 | Likely |
| R4 | His bank is Westpac, and no other | 2026-11-21 | Likely |
| R5 | The accountant must never get the app. Only Google Sheets, with viewer, commenter or editor access per file | 2026-11-21 | Likely |
| R6 | It must be a desktop app with data kept on his computer, not a web app | 2026-11-21 (the author's decision) | Answered |
| R7 | Bank data comes from downloaded statement files for now | 2026-11-21 (the author's decision) | Answered |
| R8 | Other people may want their own copy later (the scale version). Not now, and it must not show in his app | 2026-11-21 | Likely |

## Most Important

| # | Question | Assumption until answered | Affects | Status |
|---|---|---|---|---|
| 1 | Which QuickBooks plan is he on, and which screens does he use every week or month? A list or screenshots of each would settle it. Partly seen in the author's screenshots on 2026-11-22: bank transactions, rules (some posting by themselves), chart of accounts, expense list, suppliers, customers with invoices, products and services. Receipts, bills, recurring transactions, contracts and sales orders are empty | v1 covers bank import, categorising, reconciling, GST and BAS worksheet, profit and loss, balance sheet, invoices and bills. No inventory, projects, budgets or multi-currency | Folder 10, W08, scope | Open |
| 2 | What kind of business is it: sole trader, partnership, company or trust? | A company. The chart of accounts template includes equity accounts for a company, and is editable | Spec 032 (chart template) | Open |
| 3 | Is he registered for GST? Does he account for GST on a cash or an accrual basis? | Registered, cash basis. Both are settings | Specs 030, 094, 132 | Open |
| 4 | How many Westpac accounts does he use for the business, and of which kinds (everyday, savings, business credit card)? About how many transactions a month? The 2026-11-22 screenshots show several Westpac accounts, one with a sub-account | 1 to 3 accounts, including possibly a credit card, and 100 to 500 lines a month | Specs 055, 057, architecture numbers | Open |
| 5 | How often does he do a BAS (monthly or quarterly), and who lodges it? | Quarterly, lodged by the accountant from the worksheet the app produces | Specs 094 to 097 | Open |
| 6 | Which reports does the accountant need, and how often? | Profit and loss, balance sheet, BAS worksheet and the categorised transaction list, each quarter and at year end | Specs 109 to 113 | Open |
| 7 | In a shared sheet, what may the accountant change? Should his changes apply only after the client accepts them? | The accountant may edit the account, GST code and note columns only. Every change waits for the client to accept it | Specs 110, 116, 117 | Open |
| 8 | Is the accountant's Google account a Gmail address, or in another Workspace? Does the client's Workspace allow sharing files outside it? | An outside account. The client's Workspace admin allows sharing with named outside people | Spec 114, setup spec 106 | Open |

## Moving From QuickBooks

| # | Question | Assumption until answered | Affects | Status |
|---|---|---|---|---|
| 9 | From which date should the app take over? How much history should come across from QuickBooks: full history, or opening balances plus the current financial year? | Opening balances at 1 July 2026, plus every transaction since then, from QuickBooks exports | Specs 146 to 148 | Open |
| 10 | Does he send invoices from QuickBooks today? Do customers pay online through it? | He sends PDF invoices by email. No online payments in v1 | Folder 10, F06 | Open |
| 11 | Does he have employees, and how is payroll run now? | No payroll in the app. If there is payroll, its totals are entered as a journal | Scope, F07 | Open |

## The Mac, Accounts And Ownership

| # | Question | Assumption until answered | Affects | Status |
|---|---|---|---|---|
| 12 | Which Mac and macOS version does he use? Is FileVault on? | An Apple silicon Mac on a current macOS, with FileVault on | Spec 013, spec 136, `decisions/local-data-storage.md` | Open |
| 13 | Where should backups go: his Google Drive, an external drive, or both? | An encrypted copy in his Google Drive, plus an optional local folder | Spec 136 | Open |
| 14 | Who owns the Apple Developer account used to sign the app, and the Google Cloud project? | The Google Cloud project is in the client's Workspace, with the author given a limited role. The Apple Developer account is the author's, since the scale version needs it too. The author decides | Specs 106, 143 | Open |
| 15 | What should the app be called? Is there a logo? | Working title "Accounting Books", with no logo | Spec 020, packaging | Open |
| 16 | Could he download one Westpac CSV and OFX file, and send the author only the header row of the CSV, with no transactions? | Build against OFX first, which is a standard format. Build the CSV parser only after the header row arrives | Specs 058, 059 | Open |
| 17 | Does he want the app to start when the Mac starts, or only when he opens it? | Only when he opens it. Closing the window quits the app | Spec 010 | Open |

## Raised By The Wireframes (2026-11-21)

| # | Question | Assumption until answered | Affects | Status |
|---|---|---|---|---|
| 18 | When he gives a bank line an account, should the app save a rule for that description by itself, or only when he ticks "suggest this next time"? | Only when he ticks it. Suggestions from similar past lines are still shown | Specs 071, 078 to 082, W05 | Open |
| 19 | Does he split one bank line across several accounts, and how often? | Sometimes. Splitting is in v1 | Spec 072, W05 | Open |
| 20 | Should a locked quarter ever be unlockable, for example to fix a mistake the accountant finds? | No unlock in v1. A correction is entered in an open period | Spec 096 (period lock), W06 | Open |
| 21 | Does he share sheets with anyone besides his accountant, such as a bookkeeper or business partner? | Only the accountant, but sharing works with any named email | Spec 114, W07 | Open |
| 22 | Which calculations does he do by hand or in spreadsheets today (for example GST, margins, comparisons)? | The Ready formulas list in W07a: GST in an amount, amount without GST, % of income, change from last quarter, flag if over an amount, days to the BAS | Spec 113, W07a | Open |
| 23 | Does the accountant prefer one workbook with a tab per report and quarter, or a separate sheet for each? | One workbook per published report, refreshed in place, with his own tabs kept | Specs 109 to 111, W07a | Open |
| 24 | Does he want to keep making invoices and quotes in the Admin Dashboard, with this app receiving them? | Yes. This app receives issued invoices and credit notes, and does not make its own | `decisions/admin-dashboard-link.md`, specs 125 to 129, W08, W08a | Open |
| 25 | When a payment is matched here, should the Admin Dashboard also show the invoice as paid? | Not in the first version. Paid status lives in this app | `decisions/admin-dashboard-link.md`, spec 129 | Open |
| 26 | Should a new customer or supplier be saved as soon as he types the name on a bank line, or should the app ask first? | Saved straight away, with Undo, and duplicates offered for merging | Specs 071, 122, W08b | Open |
| 27 | For the accountant: does he want GST on an invoice with several lines worked out on the invoice total, then rounded, or per line, then the total rounded? (ATO, "Tax invoices", allows either) | Rounded on each bank line. Imported invoices keep the GST the Admin Dashboard worked out, and this app does not recalculate it | Specs 035, 125, 126. Raised by spec 018 | Open |
| 28 | Does he sell business assets (a van, a machine), and how should the GST on that sale be reported in the BAS? The ATO page was not read for this case | Not supported yet. A taxable credit to an asset account feeds no BAS label, and the BAS worksheet (spec 094) must list such lines instead of dropping them | Spec 036. Raised by spec 036 | Open |
| 29 | In the chart of accounts and elsewhere, should an account with a credit balance (income, what he owes, GST owing) show with a minus sign, as in the signed-off wireframe, or as a plain positive number, as QuickBooks shows it? | A minus sign for a credit balance, as in the wireframe, with a note under the table saying what it means | Specs 050 and 042, W05b | Open |
| 30 | Which numbers does he look at first when he opens QuickBooks, and is anything missing from Home? (Asked at Demo 2) | The four on Home: bank balance, lines to review, GST owing for the BAS period, profit for the financial year | Specs 048, 054 | Open |
| 31 | When he exports an OFX file from Westpac, does it ask for a date format, and does the choice change the dates written inside the file? Could he send the author the first 30 lines of one OFX file with every description and amount replaced by XXXX, to check the layout? | The app reads dates as `YYYYMMDD`, the OFX standard, and the account by the last four digits of `ACCTID`. Built and tested on invented files only | Specs 058, 062 | Open |
| 32 | Does his Westpac OFX file give each transaction a unique `FITID`, and does a statement ever list the same transaction on two files (for example at month end)? | Each line is kept once per account by its `FITID`. A file with none uses the day, amount, description and balance | Specs 056, 060 | Open |
