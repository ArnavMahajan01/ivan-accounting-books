# Where Bank Transactions Come From

**Status:** Decided: statement files the client downloads from Westpac

This decides how Westpac transactions reach the app in the first version. It does not rule out a live feed later (future idea F01).

## The Options

- **Westpac bank feeds:** Westpac sends transactions daily to accounting software.
- **Open Banking through an accredited provider:** Basiq, Fiskil or similar. The app works as a CDR representative under their accreditation.
- **Statement files:** the client exports OFX or CSV from Westpac Online Banking and drops the file into the app.
- **Logging in to Westpac with a script (screen scraping):** the app drives the client's own online banking.

## Comparison

| Topic | Bank feeds | Open Banking provider | Statement files | Screen scraping |
|---|---|---|---|---|
| Available to a custom app | No. Fixed list of providers only | Yes, under a contract | Yes | Technically |
| Automatic | Yes | Yes | No. About a minute a week | Yes |
| Cost | | Unknown, quote needed | None | None |
| Work outside the code | | Contract, register entry, consent renewal | None | |
| Risk | | Provider dependence | Missed or overlapping files, handled by the preview | Breaks bank terms, fails on two-factor sign-in, may affect fraud protection |

## Why The Choice Matters

Less than it looks. If the importer stores statement lines behind one interface, a live feed later is just another source of the same lines. The choice is only hard to change if file details leak past `src/import/`.

## Recommendation

- **Choose statement files** for the first version: it works today, costs nothing and needs no contract.
- **Plan for an Open Banking provider** as F01, once a provider confirms a price for one business or a handful of clients.
- Never screen scraping.

## Check Before Deciding

1. Westpac bank feeds go only to listed providers. Checked on 2026-11-21 on westpac.com.au, bank feeds page.
2. Westpac Online Banking exports CSV, QBO, QIF and OFX. OFX and QBO need one account selected. Checked on 2026-11-21 on westpac.com.au, export files FAQ.
3. Only accredited data recipients, or their CDR representatives, may receive CDR data. Checked on 2026-11-21 on cdr.gov.au.

## Decision

- **Chosen:** statement files downloaded by the client, OFX first, then Westpac CSV once its header row is confirmed (client question 16). A live feed is future idea F01.
- **Date:** 2026-11-21
- **Decided by:** the author
- **Reason:** the only way that works for a custom app today without a contract or cost. The author said: happy with downloading the CSV files and importing them.
- **Files updated:** `project-overview.md`, `architecture-context.md`, `feature-specs/future-ideas/F01-open-banking-live-feed.md`
