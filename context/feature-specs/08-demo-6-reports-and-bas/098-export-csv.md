# 098: Export a Report to CSV

Any report or list saved as CSV, safe to open in Excel or Sheets (risk G3).

**Client sees:** Export CSV works.

## Depends On

- 097

## Implementation

1. Save dialog in the main process. Amounts as plain numbers, dates `DD/MM/YYYY`.
2. Any cell starting with `=`, `+`, `-` or `@` is escaped so it is never a formula.

## Check When Done

- Test: a description `=HYPERLINK(...)` exports as text. The file opens correctly in Numbers.
