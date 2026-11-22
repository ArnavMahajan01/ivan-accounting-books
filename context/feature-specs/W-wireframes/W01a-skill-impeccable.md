# W01a: Skill: Impeccable (main UI skill)

Installs Impeccable as the main UI skill, so every screen is critiqued, audited and polished against a high design bar and does not get the generic AI look. Chosen in `decisions/ui-and-wireframe-skills.md`. Was spec 011a; moved here and done early, on 2026-11-22, at the author's request.

**Status:** done on 2026-11-22. Record: `context/progress/W01a-skill-impeccable.md`.

## Implementation

1. Copy only the repository's `.claude/skills/impeccable/` at the reviewed commit `b49177d` into the project, with `LICENSE` (Apache 2.0) and `NOTICE.md`. Do not run `npx impeccable install`. Do not copy `.claude/agents/impeccable-*`. Do not edit the copied files.
2. `SOURCE.md` beside it: repository, commit, date, licence, files kept, and the project rules (no launcher, no `live`, `generate`, hooks, `init` or `document`).
3. `PRODUCT.md` and `DESIGN.md` at the project root, generated from `project-overview.md` and `ui-context.md`, each saying that file wins. Surface mode: Operate.
4. `ui-context.md` ("How Screens Are Made") says when the skill is used. `.claude/skills/README.md` gets a row.

## Check When Done

- `diff -r` against the reviewed commit shows only the added `LICENSE`, `NOTICE.md` and `SOURCE.md`.
- `PRODUCT.md` and `DESIGN.md` exist, and every rule in them is in `context/`.
- In a new session, `/impeccable` is listed as a skill. Its launcher is not run.
