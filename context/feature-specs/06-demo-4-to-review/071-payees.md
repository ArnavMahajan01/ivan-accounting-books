# 071: Payees Saved and Filled In

The From/To name is saved the first time he types it, and later lines from the same place get it by themselves (wireframe W08b, Option 2).

**Client sees:** "Saved Bunnings as a supplier. 2 more lines now show it", with Undo.

## Depends On

- 070

## Decide First

- Client question 26: save straight away, or ask first. The assumption until answered: straight away, with Undo.

## Implementation

1. Migration: `contact` (id, name, kind customer, supplier or both, active, created from), `contact_match` (contact id, description words).
2. Typing in From/To suggests saved contacts first, then "Save as new contact".
3. Saving links the description words, and fills From/To on other waiting lines with the same words.
4. Undo removes the new contact and clears what it filled.

## Check When Done

- Tests for matching and undo. e2e: type a payee, see two more lines filled. `npm run check` passes.
