# 015: Skills Index and the Kit's Workflow Skills

Spec: [015](../feature-specs/01-agent-skills/015-skills-index.md)
Status: Done
Date: 2026-11-22
Branch: feature/01-agent-skills

## What was done

- The author made `feature/01-agent-skills` after committing folder 00.
- The author asked for folders 00 and 01 to be finished before wireframe sign-off. `ai-workflow-rules.md` ("Gates") now says folders 00 and 01 (specs 001 to 019, no screens) may start before W11. Screens still wait.
- Step 1: `.claude/skills/README.md` was checked against the kit's `skills/README.md` conventions (one skill per job, one `SKILL.md` with `name` and `description`, concrete triggers, pointing to `context/`, outside skills recorded with their source). It already followed them.
- Step 2: four skills copied from `~/Desktop/Claude MD rules/rules folder/skills/`, after reading each in full. The author's "complete everything till 01" was taken as approval for the four the spec names. Every `[bracket]` was replaced with this project's names, paths, commands and gates:
  - `next-spec`: the project's five gates, the branch-per-folder rule with real names, the context files and skills to load per kind of spec, `npm run check`, `format:check` and `test:e2e`, the `ELECTRON_RUN_AS_NODE` warning, the progress record and tracker updates, and the commit rules (named paths, no AI attribution, the author runs them).
  - `new-spec`: this project's spec shape from `SPEC-TEMPLATE.md` (with "Client sees" and "Depends On"), the "Adding New Work" placement rules, letter suffixes, no renumbering, and F-numbered future ideas.
  - `check-invariants`: see step 3.
  - `done-check`: the project's checks, leftover searches including real-data file types (`.ofx`, `.qif`, `.db`, screenshots) and `references/`, the protected files, and the screen sizes to look at.
- Step 3: `check-invariants` lists all ten invariants from `architecture-context.md`. For each it gives the search or test that checks it. Where the code is not built yet, it names the spec that will add the test: 038 and 042, 041, 060, 116 and 117, and 096. Commands are in code blocks, not a table, because a table would need `\|` in each command, which `grep -E` reads as a literal pipe.
- Step 4: `.claude/` goes in git. The author already committed it on `feature/00-foundations`. The README says so.
- README: four new rows. The sentence about spec 015 to come was replaced with where the skills came from.

## Verified

- The README lists the seven folders in `.claude/skills/` (`wireframe`, `impeccable`, `ui-ux-pro-max`, `next-spec`, `new-spec`, `check-invariants`, `done-check`), and nothing else.
- No `[bracket]` placeholders: `grep -n '\['` over the four skills finds only regular-expression character classes inside commands. The argument hints and the done-check report shape use `<angle>` placeholders.
- Every command in `check-invariants` was extracted from the file and run with zsh against the current code. The only hit is the one the skill names as expected (`net.fetch(pathToFileURL(file)...)` in `src/main/index.ts`). With a throwaway `src/domain/tmp-inv.ts` holding `Date.now()`, an email address and `062-000`, the purity and client-value searches found all three. The file was deleted.
- Fixed while checking:
  - The first client-value search matched every long number (test amounts, a calendar constant). It now matches BSB, ABN and email shapes only.
  - `--include=*.ts` failed under zsh until quoted.
- Skill pick-up: after the files were written, this Claude Code session's skill list showed `next-spec`, `new-spec`, `done-check` and `check-invariants`, each with its new description.

Not checked: asking "next spec" in a brand-new session. It was seen in this session's skill list, not in a new session. The author can check it by starting a new session and typing "next spec".

## Notes

- `next-spec` mentions the skills 016 to 019 add (`electron`, `sqlite-and-migrations`, `au-bookkeeping-rules`, `react-renderer`) and `guides/`, which a guide spec creates.
- `ai-workflow-rules.md` ("Commit Commands") forbids `git add .`. The command given on 2026-11-22 for the folder 00 commit used `git add -- .` with exclusions, because the author asked for everything. From now on, the commands list named paths again.
