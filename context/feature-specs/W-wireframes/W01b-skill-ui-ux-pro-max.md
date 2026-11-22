# W01b: Skill: UI UX Pro Max (second UI skill)

Installs UI UX Pro Max as a local reference: candidate palettes and type for spec 020, and UX guidelines for tables, forms and charts. Ranked below Impeccable and `ui-context.md`. Was spec 011b; moved here and done early, on 2026-11-22, at the author's request.

**Status:** done on 2026-11-22. Record: `context/progress/W01b-skill-ui-ux-pro-max.md`.

## Implementation

1. Copy only the repository's `.claude/skills/ui-ux-pro-max/` at the reviewed commit `2de1134`, without `scripts/tests/`, with `LICENSE` (MIT). Leave out its other skills and its installer. Do not edit the copied files.
2. `SOURCE.md` beside it: repository, commit, date, licence, files kept, and the rules (never `--persist`, `--force`, `--output-dir` or `preview.py`; no client data in queries; results are suggestions until written into `ui-context.md`).
3. Run one search to prove it works, and remove any Python cache it leaves.
4. `.claude/skills/README.md` gets a row.

## Check When Done

- `diff -r -x tests` against the reviewed commit shows only the added `LICENSE` and `SOURCE.md`.
- A search prints results, with no network use and no files written outside the skill.
