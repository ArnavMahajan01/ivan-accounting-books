# 031: Financial Year and BAS Periods

Spec: [031](../feature-specs/03-ledger-core/031-periods.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `src/domain/periods.ts`: `financialYearOf(date)` gives the 1 July to 30 June year with a label such as `FY 2026–27` (an en dash). `basPeriodOf(date, frequency)` gives the calendar month (`July 2026`) or the quarter (`Jul–Sep 2026`, `Oct–Dec`, `Jan–Mar`, `Apr–Jun`). `basPeriodsOfYear(year, frequency)` lists the 12 months or 4 quarters of a year in order.
- Pure integer arithmetic on year, month and day, built on `addDays` from `@shared/dates`. No `Date` is used.

## Verified

- `npm run check` passes (378 tests at this point). `src/domain/periods.test.ts` covers 30 June, 1 July, 31 December and 1 January, 29 February 2028, the turn of a century label, both frequencies, and every day of a leap financial year agreeing between `basPeriodOf` and `basPeriodsOfYear`. The periods of a year have no gap and no overlap.
- Source for the year: ATO "Preparing your tax return" (recorded in the `au-bookkeeping-rules` skill, checked 2026-11-22).

## Notes

- The period labels are display text chosen here, since the spec does not give them. The accountant's sheets (folder 09) may want different ones.
