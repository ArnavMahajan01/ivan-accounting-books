# 031: Financial Year and BAS Periods

Pure rules for the Australian financial year and BAS periods, used by every report and the lock.

**Client sees:** nothing. Internal.

## Depends On

- 030

## Implementation

1. `src/domain/periods.ts`: `financialYearOf(date)` returns the 1 July to 30 June year containing the date, with a label such as `FY 2026–27`.
2. `basPeriodOf(date, frequency)` returns the month or quarter. Quarters: Jul to Sep, Oct to Dec, Jan to Mar, Apr to Jun.
3. `basPeriodsOfYear(fy, frequency)` lists all periods of a year.

## Check When Done

- Tests: 30 June, 1 July, 31 December, 29 February 2028, each frequency.
- `npm run check` passes.
