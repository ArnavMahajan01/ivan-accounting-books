# 015: Skills Index and the Kit's Workflow Skills

Completes the project's skills index and copies in the kit's workflow skills the author approves.

**Client sees:** nothing. Internal.

## Depends On

- 014

## Implementation

1. Check `.claude/skills/README.md` (from W01, W01a and W01b) against the kit's conventions (`~/Desktop/Claude MD rules/rules folder/skills/README.md`).
2. Show the author this list and copy only those approved: `next-spec`, `new-spec`, `check-invariants`, `done-check`. Read each in full. Replace every `[bracket]` with this project's names, paths, commands and gates.
3. In `check-invariants`, list the invariants from `architecture-context.md`, each with the search or test that checks it.
4. Ask the author whether `.claude/` goes in git. If not, say so in the README.

## Scope Limits

- No kit hooks or agents unless asked. Nothing installed into `~/.claude/`.

## Check When Done

- The README lists every skill present, and nothing else.
- No `[bracket]` placeholders remain (search for `\[`).
- Asking for "next spec" in a new session picks up `next-spec`. Record what was seen.
