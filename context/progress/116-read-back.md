# 116: Read Back the Accountant's Changes

Spec: [116](../feature-specs/09-demo-7-google-sheets/116-read-back.md)
Status: Implemented, check deferred (the manual test with the accountant's test account needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- Migration `0014-accountant-changes.sql`: `accountant_change` (id, sheet link, row key = the entry's id from the Ref column, the sheet row, field, old value, new value, by, seen at, status waiting / accepted / rejected / withdrawn, decided at), and `sheet_link.checked_time`. Repository `src/data/accountant-change-repository.ts`.
- `src/google/read-back.ts` `checkSheets`: for each published Transactions workbook, Drive's "modified" time is compared with the last read; an unchanged sheet is not read again. A changed one has its Account, GST, Note and Ref columns read from the tab with the app's marker (so a renamed tab still works), to 200 rows past the published ones.
- `src/services/accountant-changes.ts` `recordReadBack`: each difference from what was published is a waiting proposal; a waiting one is updated if the cell changes again and withdrawn if it goes back; one already accepted or rejected since the last publish is not raised again. "By" is the file's last modifier from Drive.
- `src/main/sheet-check.ts`: every two minutes while the app is open, one run at a time, only while Google is connected; also run when the Accountant changes page opens (bridge `changes.check`). Logs counts only. The sidebar's Accountant changes count (`changes.count`) is asked for on focus and every two minutes.
- Values are validated when shown and when accepted: an account matches an active account by name, code, or code and name, not a bank, the GST or the transfers account; a GST code by its short code (blank means no code); a note is cut at 500 characters. Anything else is "not recognised".

## Verified

- `read-back.test.ts` with the sample books and the in-memory Google: an edit becomes one proposal and the entry is exactly as before; an unchanged sheet is not read again and the same change is not raised twice; a cell put back is withdrawn; an unknown account is "not recognised" and cannot be accepted.
- In the built app with `GOOGLE_FAKE=1`: published the transactions, quit, changed two cells in the in-memory sheet as the accountant would, started again; the page showed both, the sidebar said 2 (screenshot looked at).

**Not checked:** editing a cell as the test accountant in real Sheets and seeing it within two minutes (needs spec 106). That `lastModifyingUser` names the accountant rather than whoever touched the file last is to be confirmed there.
