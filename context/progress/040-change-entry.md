# 040: Posting Service: Change and Remove

Spec: [040](../feature-specs/03-ledger-core/040-change-entry.md)
Status: Done, on the spec's recommendation (the author to confirm)
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- **Decision (the spec's "Decide First"):** a posted entry is changed or removed through the posting service, and the audit log keeps the full before and after, unless it is on or before the lock date. This is the spec's own recommendation. The author said "go for it" to it, without choosing in words, so it is recorded in `architecture-context.md` ("Data Model") as adopted and **awaiting the author's confirmation**. The alternative (never change, only reverse) would replace the two functions with one `reverseEntry`.
- `changeEntry(ctx, entryId, input)` replaces the date, memo, source and lines (the entry keeps its id and creation time), checking the new content like any entry. `removeEntry(ctx, entryId)` removes the entry and its lines. Both refuse an entry that does not exist (`entry-not-found`) or is on or before the lock date (`entry-locked`), and each adds exactly one audit row (`entry.change` with before and after, `entry.remove` with the full entry as before and null after). They are in `post-journal.ts`, which the single-writer guard (041) requires.

## Verified

- `npm run check` passes (495 tests). `src/services/change-entry.test.ts`: a change keeps the id and adds exactly one audit row whose before and after are the full entries; an unbalanced change, a locked entry, a move into a locked period and a missing entry are refused with nothing changed; a removal keeps the whole entry in the audit row; a change and a removal each roll back if their audit row cannot be written.

## Notes

- If the author chooses the alternative, 040's functions and tests change, and the other specs that mention undo and edits (folders 06 and 07) follow it.
