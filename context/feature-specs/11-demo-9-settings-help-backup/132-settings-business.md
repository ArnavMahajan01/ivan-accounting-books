# 132: Settings: Business, GST and BAS

The business details and the GST basis and BAS frequency settings.

**Client sees:** Settings, Business.

## Depends On

- 131

## Implementation

1. Name, ABN (checked), GST basis, BAS frequency, financial year shown as fixed.
2. Changing GST basis or frequency warns that reports for open periods will change.

## Check When Done

- Tests for validation. `npm run check` passes.
