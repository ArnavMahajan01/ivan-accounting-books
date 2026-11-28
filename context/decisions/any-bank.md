# Statement Files From Any Bank

**Status:** Decided by the author on 2026-11-28: the app reads statement files from any bank, not only Westpac.

This changes `bank-data-source.md` in one way only: the files may come from any Australian bank. Files are still the only source (no live feed, no screen scraping), and nothing leaves the Mac.

## What Changes

- CLAUDE.md hard rule 4 and `project-overview.md` listed "other banks" as a scale-version feature. The author has moved it into the first version. Other clients, licensing and purchase history stay in F02.
- Future idea F03 is scheduled as specs 139a to 139f in folder 11, so the client sees it at Demo 9.

## How (the technical shape)

1. **OFX first, for every bank.** OFX is one standard. Westpac, CommBank, NAB, ANZ, St.George, Bendigo, ING, Macquarie and most others export it (also named QFX or QBO, which are OFX inside). The reader in `src/import/ofx.ts` already uses only standard OFX tags, and picks a reader from the file's contents, never its name. 139b proves it with an invented file in each common dialect.
2. **CSV from any bank by mapping its columns, not by knowing each bank.** Every bank's CSV differs: column order, one amount column or debit and credit columns, date order, a header row or none. Instead of one reader per bank, one pure reader takes a **column map** (139c), and the client confirms the map once per bank account on a screen that shows his file's first rows (139e). The map is saved and used again (139d).
3. **Known layouts as presets, when they are confirmed.** A bank whose header row is known (Westpac, after client question 16) gets a preset map, so the screen is filled in for him. A preset is data, not code.
4. **No bank names in code paths.** The words on screen say "your bank" or the bank account's own bank name, which is data (`bank_account.bank`) (139a).

## Why Not One Reader Per Bank

Banks change their CSV layouts without notice, and the author cannot see real files (CLAUDE.md hard rule 3). A mapping the client confirms on his own file keeps working when a bank changes its columns, and needs no real file in the code or tests.

## What Stays The Same

- Lines are matched to a bank account by the last four digits of the account number in an OFX file. A CSV file usually has no account number, so the client picks the account.
- Duplicates: OFX lines use the bank's `FITID` when present; CSV lines, which have none, use the date, amount and description, as `src/domain/duplicates.ts` already does for lines without a bank id.
- Money is parsed straight to cents, dates are day first unless the map says otherwise, and every rejected row is named.
