# 105: Skill: Google Sheets and Drive APIs

A skill for this project's Google work: sign-in, Sheets and Drive calls, RAW values, sharing, and change polling.

**Client sees:** nothing. Internal.

## Depends On

- 104

## Implementation

1. `.claude/skills/google-sheets-drive/SKILL.md`. Triggers: `src/google/`, "publish", "share", "sheet", "Drive".
2. Starts with: check the installed Google client library version and the current API docs.
3. This project's rules: scope `drive.file`, tokens only in the main process with `safeStorage`, values written as `RAW`, sharing by named email only, sheet edits are proposals.
4. Ends with `## Links`.

## Check When Done

- Every rule points to `security-context.md` or `decisions/google-sheets-approach.md`. Listed in the skills README.
