# 065a: Undo an Import, on the Bank Page

A "Last import" line on the Bank page with an **Undo import** button, so he can take back a wrong file. Added 2026-11-24 after the Impeccable critique of the Bank page (spec 064).

**Client sees:** under the accounts table, the file he last imported for each account, and a way to take it back.

## Depends On

- 063a, 065

## Implementation

1. Under the table, a "Last import" list with one row for each account whose last import can be undone: the file's name, how many lines it added, the day, and an **Undo import** button. Nothing shows when there is nothing to undo.
2. **Undo import** opens a confirmation (`ConfirmDialog`, Cancel focused first, the action named in words and styled as destructive): "Undo this import?", saying how many lines will leave To review, and that the file stays where it is and can be imported again.
3. After it, the table, the Last import list and the count on To review in the sidebar show the new figures, and a short notice says how many lines were removed. If the undo is refused, it says why in a sentence.
4. The guide "Bring in a Westpac statement" gains the step.

## Scope Limits

- Only the latest import of each account, as in 063a.
- No undo for lines already posted (folder 06).

## Check When Done

- Tests for the list, the confirmation, the result and the refusal. The packaged-app test imports four files, then undoes the last, and the To review count goes back.
- Both themes, 1100 and 1440. Impeccable `critique` and `audit`, P0 and P1 fixed. `npm run check` passes.
