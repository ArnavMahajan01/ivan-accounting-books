# Skills

Skills used in this project. A skill is a set of instructions a model loads only when a task needs it. Rules in `context/` and `CLAUDE.md` win over any skill.

## Installed

| Folder | What it does | Triggers when | Source | Spec |
|---|---|---|---|---|
| `wireframe/` | Makes 5 clickable black-and-white wireframe options per screen, as HTML in `wireframe/` | `/wireframe`, "wireframe", "layout options" | Magdoub, MIT, commit `44a5814` (`wireframe/SOURCE.md`) | W01 |
| `impeccable/` | Main UI skill: `critique` and `audit` on every screen, `polish` before each demo, `layout`, `typeset`, `quieter`, `clarify`, `harden` when needed. Operate mode. No launcher, `live`, `generate`, hooks, `init` or `document` | `/impeccable`, "critique", "audit", "polish", any screen work | pbakaus, Apache 2.0, commit `b49177d` (`impeccable/SOURCE.md`) | W01a |
| `ui-ux-pro-max/` | Second UI skill: a local search of palettes, type and UX guidelines. Suggestions only, written into `ui-context.md` before use | "palette", "font pairing", "UX guideline", spec 020 | nextlevelbuilder, MIT, commit `2de1134` (`ui-ux-pro-max/SOURCE.md`) | W01b |
| `next-spec/` | Builds the next spec end to end: gates, branch, context, checks, progress record, commit commands | "next spec", "implement 0XX", "continue building" | The author's kit, adapted (spec 015) | 015 |
| `new-spec/` | Writes a new spec in the project's format and places it (folder, number, indexes), or adds or schedules a future idea | "write a spec for", "add this as an idea", "schedule F0X" | The author's kit, adapted | 015 |
| `check-invariants/` | Audits the code against the ten invariants: the lint rules, one search or test per invariant, and judgment checks | after changing `src/` or `tools/`, "check invariants" | The author's kit, adapted | 015 |
| `done-check/` | Runs the done checklist on the current change and reports passed, failed and not checked | "is this done", "check before I commit", before reporting a spec done | The author's kit, adapted | 015 |
| `electron/` | Electron as built here: the window settings that must stay on, the `app://` scheme, adding a bridge function step by step, the build and packaging config, and launch problems | `src/main/`, `src/preload/`, `bridge-contract.ts`, the build or packaging config, "bridge function", "package the app" | Written for this project from the kit's template (spec 016) | 016 |
| `sqlite-and-migrations/` | SQLite with better-sqlite3: adding a table through a new migration, column rules (cents, dates, ids, unique import keys), repositories with Zod, transactions, testing with `createTestDatabase()` | `src/data/`, `.sql` files, "add a table", "migration", "repository" | Written for this project from the kit's template (spec 017) | 017 |
| `au-bookkeeping-rules/` | Double entry in signed cents with worked examples, GST, simpler BAS labels, periods, cash or accruals, each tax fact with its ato.gov.au page and date, and a "never" list | `src/domain/`, "GST", "BAS", "journal", "debit", "credit", "financial year", "tax code" | Written for this project (spec 018) | 018 |
| `react-renderer/` | React screens: data only through the bridge, `Result` handling, the states every screen needs, money and date display, the policy's limits, and where the look comes from | `src/renderer/`, "screen", "page", "component", "table", "form" | Written for this project (spec 019). Folder 02 adds tokens and components to it | 019 |
| `google-sheets-drive/` | Google as built here: plain HTTPS with `fetch`, the system-browser sign-in with PKCE, the token with `safeStorage`, `drive.file`, RAW values, his tabs kept, sharing by named email, sheet edits as proposals, and testing with a fake `fetch` or the in-memory Google | `src/google/`, "publish", "share", "sheet", "Drive", "Google", "accountant change" | Written for this project (spec 105) | 105 |

The kit's workflow skills were adapted from `~/Desktop/Claude MD rules/rules folder/skills/` at spec 015, with every placeholder replaced by this project's names, paths, commands and gates. Specs 016 to 019 and 105 add the technology skills. Order of authority for the look: the author, then `context/ui-context.md`, then Impeccable, then UI UX Pro Max, then the wireframe taste file.

## Conventions

- One skill per tool or workflow.
- Each skill is a folder holding one `SKILL.md`, with `name` and `description` in its front matter.
- The `description` names concrete triggers: file paths, commands and phrases.
- Every technology skill starts with "check the installed version", and ends with a `## Links` section pointing to the official docs.
- Skills point to `context/` files, and do not repeat their rules.
- Keep a skill short. Put long reference material in a separate file beside it.
- `.claude/` is in git (the author committed it on 2026-11-22), so the skills travel with the project. `.claude/settings.local.json` is ignored.
- Outside skills are read in full before being kept, recorded in a `SOURCE.md` with their source URL and commit, and never edited. Project rules for an outside skill go in its `SOURCE.md`.
