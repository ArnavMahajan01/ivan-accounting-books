# W01a: Skill: Impeccable (main UI skill)

Spec: [W01a](../feature-specs/W-wireframes/W01a-skill-impeccable.md)
Status: Implemented, check deferred (the new-session check)
Date: 2026-11-22
Branch: none (no repository yet)

## What was done

- Copied `.claude/skills/impeccable/` from the vetted clone at commit `b49177d`, plus `LICENSE` and `NOTICE.md`. No agents, no installer, no edits.
- Wrote `.claude/skills/impeccable/SOURCE.md` with the project rules: no launcher, never `live`, `generate`, hooks, `pin`, `foundations`, `init` or `document`.
- Wrote `PRODUCT.md` and `DESIGN.md` at the project root from `project-overview.md` and `ui-context.md`. Surface mode Operate.
- Added "How Screens Are Made" to `ui-context.md`, and a row to `.claude/skills/README.md`.

## Verified

- `diff -r` against the clone: only `LICENSE` and `NOTICE.md` differ (added). `SOURCE.md` added afterwards.
- The skill appeared in this session's skill list as `impeccable`.
- Read the parts of `SKILL.md` covering context loading, the launcher fallback, `live`, `generate`, hooks, `init` and `document`.

Not checked: running `/impeccable critique` on a real screen. There are no screens yet (first use at spec 020).

## Notes

- The launcher step in `SKILL.md` would download a native binary. The skill's own "Launcher unavailable" path is used instead (`SOURCE.md` rule 1).
