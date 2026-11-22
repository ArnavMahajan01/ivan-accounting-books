# Development Workflow

## Approach

Build this project incrementally, with a spec-driven workflow. Context files define what to build and how. Feature specs in `context/feature-specs/` define each unit of work. Always implement against them. Do not infer or invent behaviour.

This is a client project. The author is the developer you work with. The client is the business owner the app is for. You talk to the author only. Rules for client work are in `context/rules/client-project.md`.

## Working With The Author

- Build one spec at a time, in number order.
- After each spec, report what changed and how it was checked. Then stop and wait for the author's go-ahead.
- The author may approve a range of specs in one go. Stop at the end of that range, or sooner if something goes wrong.
- If a spec file is empty, or a phase has titles only, write the spec first and have it reviewed. Do not start from the title alone.
- The author verifies the context files step by step. Do not change a context file the author has not reviewed without saying so in the report.

## Scoping Rules

- Prefer small increments that show something new and can be verified.
- Do not combine unrelated system boundaries in one step.
- Build only what the spec's Implementation section says, and respect its Scope Limits.
- Gates:
  - Phase W (wireframes) comes before any code. Do not start spec 001 until W11 records the client's sign-off. Exception (the author, 2026-11-22): folders 00 and 01 (specs 001 to 019, no screens) may start before W11. Screens (spec 020 onward) still wait for W11.
  - Do not start spec 001 until `decisions/desktop-shell.md` and `decisions/local-data-storage.md` are decided.
  - Do not start folder 04 (the sample book) until spec 045 passes, or the author accepts it as passed with known issues.
  - Do not start spec 125 (invoice exchange) until `decisions/admin-dashboard-link.md` is decided and client question 24 is answered.
  - Do not start spec 107 until the setup spec 106 is done and its check passes.
  - Do not connect real client data before folder 12, and only after the checks in `security-context.md` pass.

## When To Split Work

Split a step if it combines any of these:

- Screens and the data layer.
- A migration and the feature that uses it.
- The bridge contract and the screen that calls it.
- A pure parser or rule, and the service that stores its result.
- Google calls and ledger changes.
- Behaviour the context files do not clearly define.

If a change cannot be verified end to end quickly, the scope is too broad. Split it.

## Adding New Work

When the author brings something new in the conversation (a feature, a tool, a change of plan), decide where it goes without being asked, and say where in the report:

1. **Never stuff it into an existing spec.** Write a new spec. An existing spec is changed only for a one-line pointer to the new one, or a dependency note, marked with the date.
2. **Pick the phase** by what it needs first. Something needed before code goes in phase W. A skill goes in `01-agent-skills`. A feature goes in the earliest demo folder where the client should see it, after the folder whose data it builds on. A feature change the client asks for at a demo goes in that demo's folder or the next. Anything not wanted now, or for the scale version, goes in `future-ideas/`.
3. **Pick the number.** Between two existing specs, use a letter suffix (`065a`, `W05c`). Never renumber. The one renumbering, on 2026-11-22 at the author's request before any spec was started, is in `feature-specs/RENUMBERING.md`.
4. **Split it** if it needs more than about five steps, or crosses two boundaries. Several small specs beat one large one.
5. **Update the indexes** in the same change: `feature-specs/README.md`, the tracker's "Next Up", and any gate in this file. Record a larger choice in `decisions/`.

## Handling Missing Requirements

- Do not invent product behaviour, and in particular do not invent accounting or tax rules.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it to `client-questions.md` with a safe assumption before continuing, and ask the author.
- Something the author reports about the client is `Likely` until the client confirms it.
- When a question is answered, update every context file and spec that the answer changes.

## Guardrails

Before adding any dependency or outside call, confirm that:

1. It is free, or it is a paid item the author has already approved in a decision note.
2. It runs locally, or it is Google, called only from `src/google/`.
3. It sends nothing off the Mac unless the client triggered it or switched it on.
4. It belongs to the current phase.

If any of these fail, stop and record it as an open question. Do not work around it.

## Technical Decisions

Larger decisions go in `context/decisions/<topic>.md`, with the options, tradeoffs, recommendation and final decision. Once decided, update `architecture-context.md`. Decision notes start from `context/decisions/TEMPLATE.md`.

## Future Ideas

- Specs in `feature-specs/future-ideas/` (`F01`, `F02`, ...) are not scheduled. Never implement them as part of numbered work.
- New ideas go there first, not into a numbered phase. This includes anything for the scale version.
- To schedule one: resolve its open questions, move it into a phase, give it a global number, and update the overview and architecture first.

## Skills

- Check for an existing skill before writing a new one. The kit's skills are at `~/Desktop/Claude MD rules/rules folder/skills/`.
- Read every outside skill in full before keeping it, including any scripts.
- Rules in `context/` win over any skill.
- Order of authority for the look: the author, then `ui-context.md`, then Impeccable, then UI UX Pro Max, then the wireframe skill's taste file (`decisions/ui-and-wireframe-skills.md`).
- **Wireframe** (W01): wireframes only by default, invented data only, no real client screenshots.
- **Impeccable** (W01a, installed 2026-11-22): no `live`, no `generate`, no hook, no `init` or `document`, and no launcher until the author allows it. `critique` and `audit` on every screen, `polish` before each demo (`ui-context.md`, "How Screens Are Made").
- **UI UX Pro Max** (W01b, installed 2026-11-22): never `--persist`, `--force` or `--output-dir`. No client data in queries. Results are suggestions until written into `ui-context.md`.

## Protected Files

Do not change these unless a spec explicitly requires it:

- Applied database migrations in `src/data/migrations/`.
- Third-party library internals and vendored code.
- `context/decisions/*`, once a decision is final.
- Finished progress records in `context/progress/`.
- `context/rules/*`, which are copies of the author's kit. Changes go into the kit first, and are copied here.
- Third-party skills in `.claude/skills/` (`wireframe`, `impeccable`, `ui-ux-pro-max`). Updates come from a reviewed newer commit, never by hand edits.

## Verification Per Unit

- Pure logic in `domain` and `import` has tests before any service or screen uses it.
- Services are tested against a throwaway SQLite file built from the real migrations.
- Screens are checked by running the app and using them, in light and dark, at the minimum and a large window size.
- Each screen matches the client's signed-off wireframe (`decisions/wireframe-sign-off.md`). A screen spec is not done until `/impeccable critique` and `/impeccable audit` have run on it, and every finding marked P0 or P1 is fixed or recorded with a reason.
- Desktop work is checked in the packaged app at least once per phase, not only in development.
- Google work is checked against the test Google Cloud project with a test account, never the client's.
- Accounting results (GST, BAS, reports) are checked against figures worked out by hand for invented data, written into the test.
- Anything checked with the client's real data happens only from folder 12, on his Mac, by the author or the client. The progress file records that it was done, never the data.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- Architecture, boundaries or import directions.
- The data model or saved formats.
- The bridge contract.
- Design tokens or UI conventions.
- Code conventions.
- Feature scope.

Progress records must reflect what actually happened, not what was intended. If something was skipped or could not be tested, say so.

## Before A Spec Is Done

1. The spec works within its defined scope, and every "Check When Done" item is true.
2. No invariant in `architecture-context.md` was broken.
3. `npm run check` passes, once spec 001 has created it.
4. UI changes were looked at in the running app, or the report says clearly that they were not.
5. `context/progress/<spec file name>.md` exists, and `progress-tracker.md` has a new row.
6. The matching guide in `guides/` is updated, if the spec changes something the client sees.

## Before A Phase Is Done

1. Every spec in the phase is complete.
2. The phase's verification spec passed, in the packaged app.
3. Its guides are written, and each step was followed in the app.
4. `security-risks.md` is reviewed, with no open high risk due in this phase.
5. The tracker shows the phase as done, with the date.
6. For a demo folder (`NN-demo-N-...`): its demo spec is done, his feedback is in `demo-feedback.md`, and each change he asked for has a spec or a reason.

## Bugs

Log bugs in `current-issues.md`, one per entry. Fix them one at a time, remove each entry once fixed, and record the fix in the tracker.

## Branches

**A branch per phase.** Each numbered folder in `context/feature-specs/` is built on its own branch, `feature/<phase folder>`. Before the first spec of a new phase, check the current branch (`git branch --show-current`). If it is not the phase's branch, stop and give the author the commands to commit what is there and make the branch, before writing any code. A new phase branch starts from the branch the previous phase finished on. Merging into the main branch is the author's call. A demo is always given from a packaged build of a finished folder's branch.

The folder is not a git repository yet. Spec 001 gives the author the commands to create it. Do not run `git init` yourself. Phase W happens before that. Its files (the wireframe HTML, the skills and the context changes) go into the first commit, on `feature/00-foundations`, unless the author makes the repository earlier.

Create a branch with `git checkout -b <branch>`.

## Commit Commands

The author runs commits personally. At the end of each finished step:

1. Check what changed with `git status` and `git diff`.
2. Give copy-paste `git add` commands, followed by one `git commit -m "..."` command.
3. List only files changed in this step, by path. Do not include anything already committed, unrelated work, or empty placeholder specs for future steps.
4. Never use `git add -A` or `git add .`. Never stage a parent folder that holds other phases' work.
5. Leave out anything gitignored, and say so if the author might expect it to be pushed.
6. Check for secrets and real client data before giving the commands.
7. Do not run the commit or push unless the author asks.

Commit messages are one short line saying what the change does. Never add AI attribution lines to commits or pull requests.
