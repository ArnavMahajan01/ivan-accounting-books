# 006: Calendar Dates and the Clock

Spec: [006](../feature-specs/00-foundations/006-dates.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

`src/shared/dates.ts`. No `Date` object is used:

- `CalendarDate` (`YYYY-MM-DD`) and `Timestamp` (UTC ISO, `2026-11-21T03:04:05.000Z`), both strings with a brand.
- `parseCalendarDate(text, format)` with `DateFormat` = `DD/MM/YYYY`, `D/M/YYYY`, `YYYY-MM-DD` or `YYYYMMDD`. The caller always names the format, so a day-first date is never guessed. It returns `Result<CalendarDate, DateParseError>` with the code `not-a-date` (wrong layout) or `impossible-date` (such as 31/02, or 29/02 in a year that is not a leap year), and the original text. Surrounding spaces are ignored. Years run from 0001 to 9999.
- `compareDates`, `addDays`, `daysBetween` (signed, from the first date to the second) and `formatDateAU` (`21/11/2026`).
  - `addDays` and `daysBetween` use integer day numbers from Howard Hinnant's published calendar algorithm, so no time zone can shift a day.
  - `addDays` throws a `RangeError` for a fractional day count, or a result outside 0001 to 9999. Both can only be bugs.
- The `Clock` interface (`today(): CalendarDate`, `now(): Timestamp`), and `fixedClock(today, now)` for tests.
- `parseTimestamp(text)`: reads the exact form `Date#toISOString` gives. Added because `fixedClock` needs a checked `Timestamp`, and rows read back from SQLite later need one too.

`src/main/clock.ts`: `systemClock`, the real clock.
- `today()` reads the local year, month and day (`getFullYear`, `getMonth`, `getDate`). Using `toISOString` would give the UTC date, which in Australia is yesterday until 10 or 11 am.
- `now()` is `new Date().toISOString()`.

Choices where the spec left room:

- **The real clock is in `src/main`, not `src/shared`.** If it were in `shared`, code in `domain` could import it and read the time, getting around 003's purity rule. In `main`, the boundary lint stops that.
- **`YYYYMMDD` is exactly 8 digits.** OFX dates often carry a time and zone after the date (`20261121120000[+10:AEST]`). The OFX parser (folder 05) takes the first 8 characters and passes them here.
- `DateFormat` and the error codes are in `dates.ts`, beside the function that uses them, as with money's error codes. `kinds.ts` keeps the domain's statuses and kinds.

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest "Test Files 6 passed (6), Tests 130 passed (130)". `dates.test.ts` has 55 of them and `clock.test.ts` 2.
- The spec's cases, each a test:
  - `03/04/2026` (`DD/MM/YYYY`) is `2026-04-03`, 3 April. As `D/M/YYYY`, `3/4/2026` is the same day.
  - `31/02/2026` and `29/02/2027` are `impossible-date`. `29/02/2028` is valid.
  - Month ends: 31 Jan + 1 is 1 Feb; 28 Feb + 1 is 1 Mar (2026) or 29 Feb (2028); 30 Apr + 1 is 1 May; 31 Dec + 1 is 1 Jan; 30 June + 1 is 1 July (the start of the financial year); 1 Mar - 1 is 28 Feb.
  - Also: 29/02/2100 is rejected (not a leap year), 29/02/2000 is accepted.
- `addDays` was checked against `Date.UTC` for every day from 1999 to 2031 (12,078 days), in the test only.
- `daysBetween` undoes `addDays` for 7 offsets, and a financial year has 364 days between 1 July and 30 June (365 in a leap year).
- The real clock gives the local date. With `TZ=Australia/Sydney` and the time fixed at `2026-11-21T14:30:00Z`, `today()` is `2026-11-22`. With `TZ=Australia/Perth`, it is `2026-11-21`.
- The clock test catches the UTC mistake. Changing `today()` to `toISOString().slice(0, 10)` for a moment failed it with `expected '2026-11-21' to be '2026-11-22'`. Restored, it passed.
- The boundary holds. A throwaway `src/domain/tmp-clock.ts` importing `@main/clock` failed lint with `domain may not import main`. One importing `fixedClock` from `@shared/dates` passed. Both were deleted.
- `npm run format:check`: all files formatted.

Not checked: the clock inside Electron's main process. That comes once the window exists, at spec 008.

## Notes

- The financial-year helpers (1 July to 30 June) are not here. They belong to the domain in folder 03 and are built on `addDays` and `compareDates`.
