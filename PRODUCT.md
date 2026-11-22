# Product

Generated from `context/project-overview.md` on 2026-11-22 for the Impeccable skill. That file wins wherever they differ. Do not run `/impeccable init` on this file.

## What It Is

A private bookkeeping app for the Mac, for one Australian small business owner leaving QuickBooks Online. His books live in one file on his Mac. He imports Westpac statement files, gives each bank line an account and a GST code, reconciles, runs reports and a BAS worksheet, and publishes chosen reports to Google Sheets that he shares with his accountant.

## Who Uses It

- **The client:** a tradesman running a small company. Not technical and not an accountant. Does his books every few weeks, not daily. Knows QuickBooks screens.
- **His accountant:** never uses the app. Sees Google Sheets only.

## The Core Flow

1. Download a statement file from Westpac Online Banking, and drop it into the app.
2. Check the preview: new lines, duplicates skipped, problems, closing balance.
3. Post each line in To review: match it to an invoice, or give it an account and GST code. Split or transfer when needed.
4. Reconcile, then at quarter end check the BAS worksheet and lock the quarter.
5. Publish reports to Google Sheets and share them. Accept or reject the accountant's changes.

## Constraints

- Desktop Mac app. No web version, no server, no logins.
- Data stays on the Mac unless he publishes, shares or backs up.
- The books always balance. Money is exact to the cent.
- Australian dates (day first), AUD, GST, financial year 1 July to 30 June.
- Every screen shows "Sample data" while invented data is loaded.

## Surface Mode

Operate: an app used to finish tasks. Scanability, consistency and Mac conventions come before expression.
