---
name: next-spec
description: Implement the next Accounting Books feature spec (or a given number) end to end. Reads the context files, builds exactly what the spec says, verifies every "Check When Done" item, writes the progress record and gives the author the commit commands. Use when the author says "next spec", "implement 0XX", "continue building", "continue with the specs" or "what's next".
argument-hint: "<spec number, e.g. 020>"
---

# Implement a Feature Spec

Accounting Books is built one spec at a time from `context/feature-specs/`. This skill runs that loop. Rules in `CLAUDE.md` and `context/` win over this file.

## 1. Pick the spec

- If a number was given (such as `020`), find it with `ls context/feature-specs/*/020-*.md`. Letter suffixes exist (`065a`).
- Otherwise read `context/progress-tracker.md`: "In Progress" first, then "Next Up". Take the lowest-numbered spec that is not done.
- Never pick a spec from `future-ideas/` (`F01`, ...). Phase W specs (`W..`) are wireframes, made with the `wireframe` skill.
- Respect the gates in `context/ai-workflow-rules.md` ("Scoping Rules", "Gates"). Today they are:
  - screens (spec 020 onward) wait for W11, the client's wireframe sign-off;
  - folder 04 waits for spec 045 to pass;
  - spec 125 waits for `decisions/admin-dashboard-link.md` and client question 24;
  - spec 107 waits for setup spec 106;
  - no real client data before folder 12.
  - If a gate blocks the spec, stop and say which gate.
- **A branch per folder.** Before the first spec of a folder, run `git branch --show-current`. If it is not `feature/<folder name>` (for example `feature/02-demo-1-the-app-opens`), stop. Give the author the commands to commit what is there and run `git checkout -b feature/<folder name>`, then wait. The author runs git, not you.
- If the spec file is missing or empty, stop and write it with the `new-spec` skill first.
- Say which spec you picked, in one line, before starting.

## 2. Load context (only what is needed)

- The spec file, including `## Decide First` (stop if anything there is open) and any `## Progress` checklist.
- The progress records of the specs in `## Depends On` (`context/progress/<spec file name>.md`). They say what really exists, which can differ from the plan.
- `context/architecture-context.md`: "System Boundaries" and "Invariants".
- `context/code-standards.md`: the sections for the folders being touched.
- For screens: `context/ui-context.md` (start with "How Screens Are Made"), and the `react-renderer`, `impeccable` and `ui-ux-pro-max` skills.
- For the shell, bridge or packaging: the `electron` skill and `context/rules/desktop-app.md`.
- For `src/data/` or a migration: the `sqlite-and-migrations` skill.
- For accounts, GST, BAS or journals: the `au-bookkeeping-rules` skill.
- For bank files, Google, tokens or private data: `context/security-context.md`.

Check the installed version of any library in `node_modules/<pkg>/package.json`, and its docs or types, before writing against its API.

## 3. Implement

- Build only what `## Implementation` says. Respect every line of `## Scope Limits`.
- If the spec is unclear or a requirement is missing: stop, add the question to `context/client-questions.md` (or the tracker's open questions), and ask. Never invent product behaviour.
- New logic gets tests next to it (`*.test.ts`). Invented data only: the sample business is "Harbour Lane Joinery Pty Ltd".
- A spec titled "Skill: ..." creates a skill in `.claude/skills/`, not product code. "setup-..." is a step outside the code: write out what the author must do, and wait. "guide-..." writes a user guide in `guides/`. "Demo N: ..." packages the app and prepares the client demo.

## 4. Verify

```bash
npm run check        # typecheck (both configs), lint, unit tests
npm run format:check
npm run test:e2e     # when main, preload, packaging or a demo changed: packages, checks the package, runs Playwright
```

Read the output, not only the exit code. Then check each `## Check When Done` item and the "Every Spec" list in `context/feature-specs/README.md`, one by one, with evidence. Run the real thing:
- `npm run build` and the built app, or `npm run dev`.
- For a screen: look at it at 1100 by 700 and 1440 wide, in light and dark.
- Remember that VS Code's terminal sets `ELECTRON_RUN_AS_NODE=1`. Clear it when launching Electron yourself.

Run the `check-invariants` skill when source changed, and the `done-check` skill before reporting.

## 5. Record progress

- Write `context/progress/<spec file name>.md` from `context/progress/PROGRESS-TEMPLATE.md`: spec link, status, date, branch, then "What was done", "Verified" (commands and what they printed), and "Notes". Say what was not checked.
- Update `context/progress-tracker.md`: a row in "Completed" (newest first), "Current Phase", "Next Up" (the next five), "Follow-ups" for anything found, and one line in "Session Notes".
- Update `CLAUDE.md` section 4 and `code-standards.md` ("Scripts") for any new script, and any guide or context file the change affects.

## 6. Report and stop

A short report: what was done, the check results, what was not checked, and the next spec. Then give the commit commands as `context/ai-workflow-rules.md` ("Commit Commands") says:
- `git add` with named paths, never `git add -A` or `git add .`;
- one short `git commit -m` line, with no AI attribution.
Do not run them. Wait for the author's go-ahead before the next spec, unless the author asked for several in a row.
