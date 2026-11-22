# Skills

Skills used in this project. A skill is a set of instructions a model loads only when a task needs it. Rules in `context/` and `CLAUDE.md` win over any skill.

## Installed

| Folder | What it does | Triggers when | Source | Spec |
|---|---|---|---|---|
| `wireframe/` | Makes 5 clickable black-and-white wireframe options per screen, as HTML in `wireframe/` | `/wireframe`, "wireframe", "layout options" | Magdoub, MIT, commit `44a5814` (`wireframe/SOURCE.md`) | W01 |
| `impeccable/` | Main UI skill: `critique` and `audit` on every screen, `polish` before each demo, `layout`, `typeset`, `quieter`, `clarify`, `harden` when needed. Operate mode. No launcher, `live`, `generate`, hooks, `init` or `document` | `/impeccable`, "critique", "audit", "polish", any screen work | pbakaus, Apache 2.0, commit `b49177d` (`impeccable/SOURCE.md`) | W01a |
| `ui-ux-pro-max/` | Second UI skill: a local search of palettes, type and UX guidelines. Suggestions only, written into `ui-context.md` before use | "palette", "font pairing", "UX guideline", spec 020 | nextlevelbuilder, MIT, commit `2de1134` (`ui-ux-pro-max/SOURCE.md`) | W01b |

Spec 015 adds the kit's workflow skills, and specs 016 to 019 and 105 add the technology skills. Order of authority for the look: the author, then `context/ui-context.md`, then Impeccable, then UI UX Pro Max, then the wireframe taste file.

## Conventions

- One skill per tool or workflow.
- Each skill is a folder holding one `SKILL.md`, with `name` and `description` in its front matter.
- The `description` names concrete triggers: file paths, commands and phrases.
- Every technology skill starts with "check the installed version", and ends with a `## Links` section pointing to the official docs.
- Skills point to `context/` files, and do not repeat their rules.
- Keep a skill short. Put long reference material in a separate file beside it.
- Outside skills are read in full before being kept, recorded in a `SOURCE.md` with their source URL and commit, and never edited. Project rules for an outside skill go in its `SOURCE.md`.
