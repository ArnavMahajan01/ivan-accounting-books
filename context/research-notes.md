# Research Notes

What was found about QuickBooks Australia, Westpac, Open Banking and Google before planning. Each section says when it was read and from where. These facts change: check again at the spec that relies on one, and record the date.

This file is a record of what was read on 2026-11-21. It is not a specification. `project-overview.md` and `architecture-context.md` decide what is built.

## QuickBooks Online Australia

Read on 2026-11-21 from quickbooks.intuit.com/au: the home, pricing, accounting software, invoicing, expenses, payroll, single touch payroll, GST and BAS, open banking and accountants pages, and the help article listing Open Banking banks. The live AUD prices did not load on the pricing page, so no plan price was confirmed.

### Plans

| Plan | Users | Adds, compared with the plan before |
|---|---|---|
| Simple Start | 1 | Bank feeds, BAS, invoices and quotes, receipts, mileage. No role management |
| Essentials | 3 | Recurring invoices, bills, multi-currency, cash flow planner, basic dashboards, basic roles |
| Plus | 5 | Projects, inventory, purchase and sales orders, budgets, anomaly detection, contracts, up to 40 classes and locations |
| Advanced | 25 | Custom roles, custom report builder, Excel sync, backup and restore, workflow automation |

Every plan includes access for an accountant, separate from the user count. The client pays about AUD 90 a month (reported by the author), which suggests Essentials or Plus. That is not confirmed (client question 1).

### Feature map: QuickBooks and this app

| QuickBooks feature | This app | Where |
|---|---|---|
| Bank feeds (Open Banking) | Statement file import. A live feed is a future idea | Folder 05, F01 |
| Automatic categorising and matching | Suggestions, and rules that can post by themselves | Folders 06, 07 |
| Bank reconciliation | Yes | Folder 07 |
| GST tracking | Yes | Folders 03, 05 |
| BAS summary | BAS worksheet | Folder 08 |
| BAS e-lodgement with the ATO | No. The accountant lodges | Out of scope |
| Profit and loss, balance sheet | Yes | Folder 08 |
| Invoices, quotes, reminders, recurring invoices | Invoices and PDFs. The rest waits for client question 1 | Folder 10 |
| "Pay now" on invoices | No | F06 |
| Bills and suppliers | Yes, provisional | Folder 10 |
| Receipt capture by photo and email | No | F05 |
| Mileage | No, unless client question 1 needs it | |
| Multi-currency, inventory, projects, budgets, forecasting | No, unless client question 1 needs them | |
| Payroll and Single Touch Payroll (run by Employment Hero) | No | Out of scope, F07 |
| Users and roles | No users in the app. The accountant gets Google Sheets with a Drive role | Folder 09 |
| Accountant access | Shared Google Sheets | Folder 09 |
| Mobile app | No. Mac only | |
| Backup and restore (Advanced only) | Yes | Folder 11 |

### Bank feeds in QuickBooks

- QuickBooks is moving its Australian bank feeds to Open Banking under the Consumer Data Right, and calls the old feeds screen scraping. It needs an ABN. Accounts held by a company, trust or partnership need a nominated representative set up at the bank.
- Westpac is on its list of supported Open Banking banks.

## Westpac

Read on 2026-11-21 from westpac.com.au: the business bank feeds page, the Corporate Online page, and the business online banking FAQs on exporting files and on data sharing.

- **Bank feeds** send transactions each business day to a fixed list of accounting products: BGL, Class, Desktop Super, Eagle Shared Services, MYOB, QuickBooks Online, Reckon, Saasu, SISS Data Services, SuperConcepts, Xero and Sage. The software provider must set up the feed first. **A custom app cannot use this route.** Business credit cards and term deposits are not available through feeds, except to MYOB.
- **File export** from Westpac Online Banking, on a desktop: CSV, QBO, QIF or OFX. QBO and OFX only when one account is selected. CSV can cover several accounts. Payees export as CSV only. This is the route the app uses.
- **Open Banking:** business accounts can be shared with an accredited data recipient. The Online Banking administrator must nominate the users who may share the organisation's data.
- **How to export, read 2026-11-24** from westpac.com.au, "Export Transaction Lists, Payees, and Accounts Online" (the same steps for business and personal customers). Transactions, on a desktop: go to **Overview** and select **Exports and reports**; in the **Transactions** section select **Export**; choose a **date range**, select the **account(s)**, choose a **file format** and a **date format**, then select **Export**. The page says "QBO and OFX formats are only available when you select one account to export". It gives no limit on how far back a date range may go, and does not say what the date format options are or whether they change the dates inside an OFX file (client question 31). The OFX files the app reads follow the public OFX specification, in its text layout and its XML layout (OFX Work Group, financialdataexchange.org). No real Westpac OFX file has been seen, so every test file is invented.
- **Not found:** any automatic delivery of statement files, any developer API for business customers, and MT940 or BAI2 formats. The Westpac CSV column layout was not found either (client question 16).

## Open Banking (Consumer Data Right)

Read on 2026-11-21 from cdr.gov.au, oaic.gov.au, basiq.io and fiskil.com search results.

- Only an accredited data recipient may receive bank data under the CDR. It does not matter how small the app is or whether data is shared with anyone else. There is no personal developer route to one's own Westpac data.
- A business can avoid its own accreditation as a **CDR representative** of an accredited principal, under a written contract, once it is entered on the Register of Accredited Persons. A representative may have only one such arrangement.
- **Basiq** (owned by Cuscal) and **Fiskil** offer this. Neither publishes prices. Both have free test environments. Whether either takes a single small business, or an app with a handful of clients, is unknown. Ask them before scheduling F01.
- **Up** has a personal access token API, for personal use only. It is not a fit for a Westpac business.

## Google Sheets And Drive

Read on 2026-11-21 from developers.google.com (Sheets API ranges samples, Apps Script Protection class, Sheets API scopes) and community and vendor help pages about embedding.

- **Sharing is per file.** Drive roles are viewer, commenter and editor. There is no way to hide one tab of a file from someone who can open the file. Anything the accountant must not see goes in a separate file.
- **Protected ranges** stop editing, not viewing. They take a list of editor emails. Being a protected range's editor does not give access to the file. The file must be shared too.
- **Sheets API scopes apply to whole files.** They cannot be limited to one tab.
- **Embedding the Google Sheets editor** in another page depends on third-party cookies and on Google allowing it. Published-to-web embeds are read only. In a desktop app's built-in browser window, Google often refuses sign-in ("This browser or app may not be secure"). This is why the app does not embed the editor.
- **For a desktop app, from earlier knowledge, to confirm at spec 106:** a Workspace can mark its own OAuth app as Internal, so Google does not review it. The `drive.file` scope reaches only files the app created or opened, and does not need Google's security assessment. Sign-in should use the system browser with PKCE and a loopback redirect. Viewers and commenters can be stopped from downloading, copying and printing in the Drive sharing settings.

## Australian Tax Facts Used

From general knowledge. Each is checked on ato.gov.au at the spec that uses it, with the date recorded in that spec's progress file.

- GST is 10%. The GST inside a GST-inclusive price is one eleventh of it.
- The financial year runs 1 July to 30 June.
- Small businesses under the turnover limit report GST on the simpler BAS: G1 (total sales), 1A (GST on sales) and 1B (GST on purchases).
- Business records must be kept for five years.
- Lodging a BAS or STP report from software needs that software to be registered with the ATO. This is why the app does not lodge.

## Sources

- QuickBooks AU: https://quickbooks.intuit.com/au/ , /au/pricing/ , /au/open-banking/ , /au/gst-and-bas/ , /au/payroll/ , /au/accountants/
- QuickBooks Open Banking banks: https://quickbooks.intuit.com/learn-support/en-au/help-article/bank-accounts/banks-support-open-banking-connections-quickbooks/L4WX6c8fz_AU_en_AU
- Westpac bank feeds: https://www.westpac.com.au/business-banking/online-banking/bank-feeds/
- Westpac export files: https://www.westpac.com.au/business-banking/online-banking/support-faqs/export-files/
- Westpac data sharing: https://www.westpac.com.au/business-banking/online-banking/support-faqs/data-sharing/
- CDR representatives fact sheet: https://www.cdr.gov.au/sites/default/files/2024-12/CDR-representatives-fact-sheet-published-20-December-2024.pdf
- OAIC on CDR representatives: https://www.oaic.gov.au/consumer-data-right/consumer-data-right-guidance-for-business/privacy-obligations/cdr-representative-model-privacy-obligations-of-a-cdr-representative
- Basiq: https://basiq.io/pricing
- Fiskil: https://www.fiskil.com/grow/banking-api/open-banking-au/cdr-accreditation
- Up API: https://developer.up.com.au/
- Google Sheets protected ranges: https://developers.google.com/sheets/api/samples/ranges
- Apps Script Protection: https://developers.google.com/apps-script/reference/spreadsheet/protection
- Sheets API scopes: https://developers.google.com/sheets/api/scopes
