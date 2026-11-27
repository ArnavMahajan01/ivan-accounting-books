# 113: Ready Formulas Tab

Spec: [113](../feature-specs/09-demo-7-google-sheets/113-ready-formulas.md)
Status: Implemented, check deferred (the results in a real test sheet need spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `src/domain/ready-formulas.ts`: the six formulas from W07a as data (name, what it does, the formula to copy, an example): GST in an amount, Amount without GST, % of income, Change from last quarter, Flag if over an amount, Days until the BAS is due. Client question 22 is still open; this is the W07a list, as the spec says.
- GST is one eleventh, rounded to the cent, never 10%: the formula text comes from `gstInsideFormula` in `src/domain/gst.ts`, so the rule is still written in one file only (the project's guard test caught a second copy and it was moved there).
- "Days until the BAS is due" counts to this quarter's usual due date. `basDueDate` was added to `src/domain/periods.ts` from the ATO dates in the bookkeeping skill (28 October, 28 February, 28 April, 28 July; a month on the 21st of the next month), saying it is the usual date when he lodges himself.
- The Ready formulas tab of every workbook: explanations and the formulas to copy as plain text (RAW); only each row's example result is a working formula, pointed at its own example figures (USER_ENTERED, app-made, never bank text).
- In the app: Shared sheets → **Ready formulas** opens the list with **Copy**, which puts the formula on the Mac's clipboard through a new bridge function `app.copyText` (the page's own clipboard access is refused by the permission policy). Formulas show in a new monospace token, `--font-family-mono` (`ui-context.md`, Typography).

## Verified

- `ready-formulas.test.ts`: GST as one eleventh and nothing written as 10%; the countdown to 28/02/2027 from 27/11/2026; text and formulas in the right cells, each example pointed at its own row. Due dates for every quarter and for a month across the year end.
- `shared.test.tsx`: Copy sends the formula to the clipboard and says "Copied …".
- In the built app with `GOOGLE_FAKE=1`, dark theme at 1100: the list, Copy on "GST in an amount", and the Mac's clipboard then held `=ROUND(B2/11, 2)` (read back from the main process).

**Not checked:** that each example gives the expected result in a real test sheet (needs spec 106). Expected: 10.00, 100.00, 0.25, 2,498.35, Check, and the days to 28/02/2027.
