# 006: Calendar Dates and the Clock

Adds calendar dates as `YYYY-MM-DD` strings and an injectable clock, so Australian day-first dates are never misread and no domain code depends on the current time.

**Client sees:** nothing. Internal.

## Depends On

- 004

## Implementation

1. `src/shared/dates.ts`: branded `CalendarDate` (`YYYY-MM-DD`) and `Timestamp` (UTC ISO) types.
2. `parseCalendarDate(text, format)` for `DD/MM/YYYY`, `D/M/YYYY`, `YYYY-MM-DD` and `YYYYMMDD` (OFX). Rejects impossible dates.
3. `compareDates`, `addDays`, `daysBetween`, `formatDateAU` (`21/11/2026`).
4. A `Clock` interface: a real clock for the main process, a fixed clock for tests. "Today" is always the Mac's local date in Australia, never a UTC `Date` turned into a day.

## Rules And Edge Cases

- `03/04/2026` is 3 April. `31/02/2026` and `29/02/2027` are errors. `29/02/2028` is valid.

## Check When Done

- Tests for each case above, and a month end.
- `npm run check` passes.
