# 048: Home: Summary Numbers and Warnings

Spec: [048](../feature-specs/04-demo-2-the-sample-book/048-home-numbers.md)
Status: Done (Impeccable skill not run, see Notes)
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- Bridge function `home.getSummary` (`src/services/get-home-summary.ts`): **bank balance** (the active bank accounts, added up, as at today), **lines to review** (zero until folder 05), **GST owing** for the BAS period in progress (the GST on the entries in that period, collected less paid, counted up to today) and **profit** for the financial year so far (income less expenses since 1 July). All are worked out from the journal lines each time.
- Home (`HomePage.tsx`, `HomeNumbers.tsx`): the wireframe's Option 2, with the To do box on the left and the Numbers box on the right. Each number is a link: Bank balance, GST owing and Profit open Accounts (where the same balances are, until the Bank page and Reports exist), and Lines to review opens To review. Amounts use the `Amount` component.
- **Warnings:** the books check's problems (`out-of-balance`, `integrity-failed`) show as red messages at the top of Home, in words he can act on, and only when something is wrong. If the summary cannot be read, Home says so in plain words.
- States: a placeholder while it loads, the error, books with no entries (the getting-started list, with no numbers), and the numbers.

## Verified

- `npm run check` passes. `src/services/views.test.ts`: on the sample books the four numbers are exactly the wireframe's ($43,642.35 with 2 accounts, 0 lines, $3,184.20 for Oct–Dec 2026, $42,453.50 for FY 2026–27) and match the sample figures list; **a forced books problem shows a warning** (a line changed straight in the database gives `out-of-balance`); the GST moves to the next BAS period when the date does, and counts only the part of a period up to today; new books and books before the business is set up show zeros.
- `home.test.tsx` (11 tests): the numbers and their links, a minus sign on a negative figure, one account in the singular, the up-to-date state, jobs with their buttons, the warnings, loading, failure and getting-started.
- **Looked at in the real app** at 1100 by 700 and 1440 wide, in light and dark (screenshots): the figures are exactly the wireframe's. Fixed on the way: the dividers between the numbers had curved ends.
- Accessibility, checked in the real app: Tab visits the sidebar and the four numbers, each with a name and a visible focus ring, and nothing is unnamed.

## Notes

- **Impeccable `critique` and `audit`:** the skill was not run. I looked at the screens at both sizes and both themes and ran a keyboard pass in the real app instead (every Tab stop named, every stop with a focus ring). The author may want the skill run on Demo 2's pages.
- GST owing is worked out from the GST recorded on each line, which is right for the books as built. When invoices arrive (folder 10) and for a business on the accrual basis, it will need the BAS worksheet's rules (folder 08).
