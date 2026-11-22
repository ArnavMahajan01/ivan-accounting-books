# W01b: Skill: UI UX Pro Max (second UI skill)

Spec: [W01b](../feature-specs/W-wireframes/W01b-skill-ui-ux-pro-max.md)
Status: Done
Date: 2026-11-22
Branch: none (no repository yet)

## What was done

- Copied `.claude/skills/ui-ux-pro-max/` from the vetted clone at commit `2de1134`, without `scripts/tests/`, plus `LICENSE`. No other skills, no installer, no edits.
- Wrote `SOURCE.md` with the project rules, and a row in `.claude/skills/README.md`.

## Verified

- `diff -r -x tests` against the clone: only `LICENSE` differs (added).
- Imports in `scripts/*.py`: standard library only, no network calls. `preview.py` contains Google Fonts links for preview HTML, which is never used.
- `python3 -I .claude/skills/ui-ux-pro-max/scripts/search.py "data table" --domain ux` returned 3 guidelines (table handling, bulk actions, one more). A first query with `--stack react` returned no match.
- The `__pycache__` folder left by the first run was removed. `SOURCE.md` now says to run with `PYTHONDONTWRITEBYTECODE=1`.
- The skill appeared in this session's skill list as `ui-ux-pro-max`.

## Notes

- First real use: spec 020 (design tokens), for candidate palettes and type.
