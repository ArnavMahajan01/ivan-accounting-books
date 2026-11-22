# 023: Empty State, Sheet, Confirm and Sample Data Label

The components that carry the app's promises: nothing is lost by accident, sample data is always labelled, and empty pages say what to do next.

**Client sees:** empty pages that explain themselves, confirmations, and the "Sample data" label.

## Depends On

- 022

## Implementation

1. `EmptyState`: icon, one sentence, the next action.
2. `Sheet`: a Mac-style panel over the page. Traps focus, closes on Escape, returns focus.
3. `ConfirmDialog`: says what will change, destructive action in words.
4. `ErrorMessage`: plain language and a retry, never raw error text.
5. `SampleDataLabel`: the visible "Sample data" label.

## Check When Done

- Tests for focus trapping and Escape. Shown on the components page.
- Impeccable `critique` and `audit`, P0 and P1 fixed. `npm run check` passes.
