# 112: Sheet-Style Preview Before Publishing

A grid preview of exactly what Google will get, drawn by the app, beside the report (W07a, Option 3).

**Client sees:** the preview with its tabs before he clicks Publish.

## Depends On

- 111

## Implementation

1. A read-only grid component from the same data the publish will send: tabs, column letters, rows.
2. Says whether it creates a new workbook or updates one, and which tabs are left alone. Works offline.

## Check When Done

- The preview matches the published sheet cell for cell (manual check). Impeccable `critique`.
