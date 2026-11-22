## Application Building Context

A private Mac accounting app for one Australian small business client, replacing QuickBooks Online. It keeps the books in a local SQLite file, imports Westpac statement files, and shares reports with the client's accountant through Google Sheets in the client's own Google Workspace. Built as an Electron app in TypeScript (recommended, see `decisions/desktop-shell.md`). Library versions move fast. Check the installed version's docs in the dependency folder or on the official site before writing code against an API from memory, and heed deprecation notices.

Read these files in order before implementing anything or making an architectural decision:

1. `context/project-overview.md`: product definition, goals, features and scope
2. `context/architecture-context.md`: stack, boundaries, data model and invariants
3. `context/ui-context.md`: tokens, typography, screens and component conventions
4. `context/code-standards.md`: implementation rules and conventions
5. `context/ai-workflow-rules.md`: workflow, scoping rules, branches, and when a spec is done
6. `context/progress-tracker.md`: current phase, completed work and next steps

Also:

- `context/client-questions.md`: what the client has not confirmed, and the assumption in use until he does
- `context/research-notes.md`: what QuickBooks AU, Westpac, Open Banking and Google can and cannot do, with sources and dates
- `context/security-context.md` and `context/security-risks.md`: rules for the client's financial data, and the known risks
- `context/current-issues.md`: known bugs
- `context/decisions/`: one note per larger decision. Read the matching note when a spec points to it
- `context/guide-writing-rules.md`: how user guides are written
- `context/rules/`: general working rules, plus `desktop-app.md`, `client-project.md` and `web-app.md` for this kind of project

## Feature Specs

Feature work is defined in `context/feature-specs/`. Specs are grouped into folders (`00-foundations/`, `01-agent-skills/`, `02-demo-1-the-app-opens/`, ...), most of them ending in a client demo, and numbered globally (`001`, `002`, ...). Implement them in number order, one at a time. `context/feature-specs/README.md` is the index.

An empty spec file, or a title with no file, is not ready to build. Write it with the `new-spec` method, and have the author review it first.

`context/feature-specs/future-ideas/` (specs `F01`, `F02`, ...) holds ideas for later, including the whole scale version. They are not part of the build order. Do not implement them until they are moved into a numbered phase.

Build order (restructured 2026-11-22): wireframes first (phase W, with the two UI skills W01a and W01b installed). Nothing is built until the client signs off (W11). Then foundations (00) and agent skills (01). From then on the client sees the app grow in demos, each folder ending with a demo spec: the app opens (02), the ledger core (03, internal), the sample book (04), importing a Westpac file (05), categorising (06), rules and reconciling (07), reports and the BAS (08), Google Sheets (09), contacts and invoices from his Admin Dashboard (10), settings, Help and backups (11), and go-live with real data (12). Every spec from 001 to 151 is written in full, small, and builds on the one before. Demos use the invented sample business until go-live. When the author brings new work, place it as "Adding New Work" in `ai-workflow-rules.md` says: a new spec in the right phase, never folded into an existing one.

## Skills

Project skills live in `.claude/skills/` (index: `.claude/skills/README.md`). Installed: `wireframe`, `impeccable` and `ui-ux-pro-max`. Specs titled "Skill: ..." create them, right before the phase that first uses that technology. The kit they come from is at `~/Desktop/Claude MD rules/rules folder/skills/`. Three outside skills were chosen in `decisions/ui-and-wireframe-skills.md`: `wireframe` (W01), `impeccable` as the main UI skill (011a), and `ui-ux-pro-max` as the second (011b). Rules in `context/` win over any skill.

## Guides

`guides/` holds plain-language guides for the client, shown in the app's Help. A feature is not finished until its guide matches the app. Rules are in `context/guide-writing-rules.md`.

## Keeping Records

When a spec is finished, write `context/progress/<spec file name>.md` (what was done, how it was verified, notes), and add one row to the **Completed** table in `context/progress-tracker.md`. Progress files are created only when their spec is done, never ahead of time. Keep the tracker itself to tables and short lists.

If implementation changes the architecture, scope or standards in the context files, update the relevant file before continuing. If the context files and a spec disagree, stop and ask the author.

## Branches And Commits

One branch per phase, named `feature/<phase folder>`, such as `feature/00-foundations`. Never commit or push unless the author asks. After each finished step, give copy-paste `git add` and `git commit` commands. Never use `git add -A` or `git add .`. Stage only the current step's work. Details are in `context/ai-workflow-rules.md`.

## Hard Rules

- The ledger always balances, money is integer cents, and only the posting service writes ledger rows.
- Data leaves the Mac only through a feature the client triggered or switched on.
- Never use real client data anywhere in the repo, the logs or a prompt. Invented data only.
- One client now. Scale-version features stay in future ideas, and client-specific values are data, never code.
- Do not invent product behaviour. Add missing requirements to `client-questions.md`, and ask.
- Finish each phase in order before starting the next one, unless the author says otherwise.
