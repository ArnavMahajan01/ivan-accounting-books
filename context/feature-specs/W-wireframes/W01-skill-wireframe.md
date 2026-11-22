# W01: Skill: Wireframe

Installs Magdoub's `wireframe` skill into this project, so every screen can be shown to the client as clickable black-and-white options before any app code exists. Chosen in `decisions/ui-and-wireframe-skills.md`.

## Implementation

1. Give the author the command to fetch the skill at the reviewed commit, into a throwaway folder, and wait: `git clone https://github.com/Magdoub/claude-wireframe-skill.git <tmp folder>` then `git -C <tmp folder> checkout 44a5814`. If the latest commit is newer, read what changed in full before using it, and record the new commit.

2. Copy `SKILL.md`, `LICENSE`, `README.md` and the `wireframe/` folder (templates and `brain/design-taste.md`) into `.claude/skills/wireframe/`. Leave out `examples/` and `.git/`. Do not edit the copied files.

3. Add `.claude/skills/wireframe/SOURCE.md`: the repository, the commit, the date, the licence (MIT), the files kept, and these project rules for using it:
   - Desktop platform. Choose **Wireframes only** unless the author asks for colour.
   - Invented data only: an invented business, Australian dates, AUD amounts and GST.
   - No real client data in any wireframe, screenshot or `design-context.md`.

4. Create `.claude/skills/README.md` with the conventions from the kit's `skills/README.md` and one row for `wireframe`. Spec 015 extends this file later rather than creating it.

5. Ask the author whether `wireframe/` (the output folder at the project root) goes in git. Recommendation: yes for the HTML, no for `wireframe/brain/*.png` and other screenshots. Add the matching `.gitignore` lines once the repository exists (spec 001). Until then, note it in the progress file.

## Scope Limits

- Nothing installed into `~/.claude/`.
- No wireframes made. W02 onwards.
- No UI skills. Specs W01a and W01b.

## Check When Done

- `.claude/skills/wireframe/SKILL.md` matches the reviewed commit, byte for byte. Compare it with the clone using `diff`.
- In a new session, typing `/wireframe` shows the skill. Record what was seen.
- `SOURCE.md` and `.claude/skills/README.md` exist and are filled in.
