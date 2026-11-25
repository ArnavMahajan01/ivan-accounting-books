# 063a: Undo an Import

Takes the latest import of an account back, while none of its lines has been used, so a wrong file is not a mistake he has to live with. Added 2026-11-24 after the Impeccable critique of the Bank page (spec 064), at the author's request.

**Client sees:** nothing yet. The button comes in 065a.

## Depends On

- 063

## Implementation

1. `src/services/undo-import.ts` `undoImport(ctx, batchId)`: in one transaction, removes the batch and every line it added, and writes an audit row (`import.undo`, holding the batch, and no line descriptions).
2. Only the **latest** import of an account can be undone (the one with the newest `imported_at`), and only while **every** one of its lines is still `to-review`. Otherwise it refuses with a reason: `not-found`, `not-the-latest` or `lines-already-used`. Nothing is changed when it refuses.
3. `src/data/statement-repository.ts`: delete a batch's lines, and the batch.
4. Bridge function `bank.undoImport` (`{ batchId }`, answering `undone` with how many lines were removed, or `refused` with the reason). `bank.list` gives each account its last import (batch id, file name, lines added, the day) and whether it can be undone.
5. The count of imported lines and the Bank page's figures follow, because they are read from the lines.

## Rules And Edge Cases

- After an undo the same file imports as new lines again, because its keys are free.
- Undoing the first import of an account removes the starting balance the later checks use, and the next earliest file's own starting balance takes its place (spec 061). Because only the latest import can be undone, the files before it are never left inconsistent.
- The log holds counts only.

## Scope Limits

- Does not undo lines that have been posted or excluded (folder 06, spec 075, un-posts a line).
- Does not undo an import that is not the account's latest, and does not undo several at once.
- No screen: that is 065a.

## Check When Done

- Tests: the latest import is removed with its lines, and a fresh import of the same file adds them again. An earlier import, an import with a line already used, and an id that does not exist are refused and change nothing. A forced failure part way through removes nothing. The audit row holds no description.
- `npm run check` passes.
