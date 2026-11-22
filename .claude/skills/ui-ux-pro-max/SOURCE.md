# Source: ui-ux-pro-max

- **Repository:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Commit:** `2de1134` ("fix(projects): precompile sample styles so they render offline")
- **Copied:** 2026-11-22, for spec W01b, at the author's request
- **Licence:** MIT (`LICENSE`, kept unchanged)
- **Files kept:** the repository's `.claude/skills/ui-ux-pro-max/` folder (`SKILL.md`, `data/`, `references/`, `scripts/` without `scripts/tests/`), plus `LICENSE`. Not copied: its other skills (`design`, `brand`, `banner-design`, `slides`, `ui-styling`, `design-system`), its CLI installer, and the rest of the repository.
- **Changes:** none, apart from leaving out `scripts/tests/`. The copy matched the commit (`diff -r -x tests`, 2026-11-22).
- **Checked:** the scripts use the Python standard library only. They make no network calls. `preview.py` writes Google Fonts links into preview HTML, which is never used here.

## Role In This Project

The second UI skill: a local reference. Impeccable leads, and `context/ui-context.md` outranks both.

## Project Rules For Using It

1. Run searches as `python3 -I -B .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>` (a project install, not a plugin). `-B` stops Python writing a `__pycache__` folder into the skill. Corrected on 2026-11-22: the earlier form used `PYTHONDONTWRITEBYTECODE=1`, which `-I` ignores, so it left a cache folder.
2. **Never** use `--persist`, `--force`, `--output-dir`, or `preview.py`, so it never writes a second design system or loads web fonts.
3. Queries never contain client data.
4. Results are suggestions. Anything adopted is written into `context/ui-context.md` first, with the date.
5. **Use:** candidate palettes, type and chart styles at spec 020 (design tokens), and checking a table, form or chart against its UX guidelines.
6. Tested on 2026-11-22: `search.py "data table" --domain ux` returned 3 guidelines (table handling, bulk actions and one more).
7. **Updating:** read any newer commit's changes to this folder in full before copying it, then record it here (risk K4).
