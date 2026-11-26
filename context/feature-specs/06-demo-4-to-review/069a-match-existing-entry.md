# 069a: Match a Line to an Entry Already in the Books

Added 2026-11-25, while building folder 06. A bank line can be the bank's record of an entry the books already hold (signed-off wireframe W05 Option 1, "Match or account", key M; `ui-context.md`, "To review"). Matching links the two and posts nothing, so the movement is never counted twice. Without it, importing a file into the sample books puts their November movements in twice (`architecture-context.md`, "Importing A Bank File", "What is not decided here").

**Client sees:** "Match" with the entry's payee, "same amount in your books", and a Match button.

## Depends On

- 069

## Implementation

1. `src/domain/entry-match.ts` (pure): an entry that moves the same amount through the same bank account within five days, closest day first.
2. `listMatchableEntries`: entries touching one of his bank accounts that no bank line is linked to yet. One entry is offered to one line only.
3. `matchLine`: links the waiting line with the entry (`statement_line.entry_id`), with a `line.match` audit row. No journal row is written.
4. Undo unlinks it and leaves the entry.

## Scope Limits

- Matching a deposit to an invoice is folder 10 (spec 129).
- The five-day window is a starting point, for the author to confirm.

## Check When Done

- Tests: offered and linked; another amount, an entry already linked, or a line too far away is not offered; two lines for the same amount get the entry once; undo leaves the entry.
- The 2 to 13 November fixture imported into the sample books: every line is offered a match, and matching them all leaves the books exactly as they were.
