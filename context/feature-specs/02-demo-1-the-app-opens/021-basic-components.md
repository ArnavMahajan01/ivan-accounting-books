# 021: Basic Components: Button, Badge, Amount, Date

The small components every screen reuses, so money, dates and actions look and behave the same everywhere.

**Client sees:** the buttons, labels, amounts and dates he will use on every page.

## Depends On

- 020

## Implementation

1. `Button`: default, main action (accent), destructive, small; focus ring; disabled.
2. `Badge`: the statuses in `ui-context.md` ("Badges"), always with words, never colour alone.
3. `Amount`: right-aligned, tabular figures, minus sign for negatives, uses `formatCents`.
4. `DateCell`: `21/11/2026`, uses `formatDateAU`.
5. A components page in development only, showing each in both themes.

## Check When Done

- Component tests cover each variant. `Amount` shows `-$1,234.50` for -123450.
- Impeccable `critique` and `audit` on the components page, P0 and P1 fixed.
- `npm run check` passes.
