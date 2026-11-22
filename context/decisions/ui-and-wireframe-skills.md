# Which UI And Wireframe Skills To Use

**Status:** Decided: Magdoub's `wireframe` for wireframes, Impeccable as the main UI skill, UI UX Pro Max as the second

This decides which outside skills shape the app's screens, and in what order of authority. It does not change the look itself: `ui-context.md` stays the one home for tokens, type and screens, and wins over every skill.

The author asked on 2026-11-21 for the Impeccable and UI UX Pro Max skills, so the app does not look AI-generated, and for wireframes to come first, so the client can agree the screens before anything is built. The author asked Claude to pick the wireframe skill and to rank the two UI skills.

## The Options

**Wireframes**

- **Magdoub `wireframe`** (github.com/Magdoub/claude-wireframe-skill): for each screen, one HTML page with 5 clickable black-and-white layout options (1 safe, 4 exploratory), notes on each, a scored summary and a recommended option. Optional colour variants.
- **Paperclip `wireframe`** (github.com/paperclipai/paperclip, `packages/skills-catalog/catalog/bundled/product/wireframe`): one static black-and-white SVG per screen at 1280 by 800, a flow diagram, and an optional HTML viewer with zoom.
- **Collective Brain `ux-flow-wireframer`:** a Markdown document with a Mermaid flow and ASCII box wireframes.
- **MCP Market "Wireframing"** (spjoshis): a listing with no stated output format.
- **Wirekitty:** a hosted product with its own editor and share links, not a skill. Designs are sent to its servers.

**UI skills**

- **Impeccable** (github.com/pbakaus/impeccable): design direction plus named commands such as `critique`, `audit`, `polish`, `typeset`, `layout`, `quieter` and `harden`, and a detector for generic AI design.
- **UI UX Pro Max** (github.com/nextlevelbuilder/ui-ux-pro-max-skill): a local search over CSV data, covering styles, palettes, font pairings, 130 UX guidelines, chart types and stack notes, plus a design system generator.

## Comparison: Wireframes

| Topic | Magdoub | Paperclip | Collective Brain | MCP Market | Wirekitty |
|---|---|---|---|---|---|
| Output | Clickable HTML, 5 options per screen | Static SVG per screen, flow, viewer | Markdown, Mermaid, ASCII | Not stated | Hosted editor |
| Good for a client conversation | Yes: options side by side, a recommendation, things to click | Yes, but not clickable | No, text only | Unknown | Yes |
| Stays on the Mac | Yes | Yes, unless its optional publish step is used | Yes | Unknown | No |
| Read in full | Yes: `SKILL.md`, templates, script, taste file | `SKILL.md` only | `SKILL.md` page | No | Not a skill |
| Licence | MIT | MIT | Not stated | Not stated | Proprietary |
| Size | 10 files | 7 files | 1 file | Unknown | Hosted |
| Cost | Free. Colour variants start 5 agents, which use more tokens | Free | Free | Unknown | Pricing not shown |

## Comparison: UI Skills

| Topic | Impeccable | UI UX Pro Max |
|---|---|---|
| Strongest at | Judging and improving real screens: critique, audit, polish, and catching the generic AI look | Looking things up: palettes, font pairs, UX guidelines, chart choice |
| Fit with an app UI | Has an "Operate" mode for app screens, where precision beats expression | Generic, many web and marketing styles |
| Conflict with `ui-context.md` | Wants its own `PRODUCT.md` and `DESIGN.md` | Can write `design-system/MASTER.md` with `--persist` |
| What it runs | A launcher that downloads a native binary from its GitHub releases on first use, checked against a checksum list. Has a documented fallback with no launcher | Python standard library only. No network, no subprocess. Checked by search on 2026-11-21 |
| Risks | Live mode can run `claude` with permissions bypassed. Its installer offers a hook on every edit | Data files are large (about 3.7 MB). Results are generic unless the query is narrow |
| Licence | Apache 2.0, with a NOTICE file | MIT |

## Why The Choice Matters

The wireframe skill decides what the client sees first, and how easy it is for him to choose. It is easy to change later, since wireframes are throwaway HTML outside the app code. The ranking of the UI skills matters because two skills that both set the look will disagree. One must lead, and `ui-context.md` must outrank both.

## Recommendation

- **Wireframes: Magdoub `wireframe`.** Clickable options with a recommendation fit "show the client, let him choose" better than static pictures. It runs locally, is small, and was read in full. Use **wireframes only** (black and white) for client reviews, since that keeps attention on layout, not colour. Colour variants only when the author asks, because they load Google Fonts and start 5 agents.
- **Main UI skill: Impeccable,** in Operate mode, used after each screen is built: `critique` and `audit` before a screen spec is done, and `polish` before a phase is done. It is aimed directly at the "looks AI-made" problem. Used without its launcher, live mode, `generate` or hook at first. Turning on the launcher is the author's decision, once its binary download is accepted.
- **Second UI skill: UI UX Pro Max,** as a reference only: candidate palettes and type at spec 020, and UX guideline checks for forms, data tables and charts. Never `--persist`. Queries never include client data.
- **Order of authority:** the author, then `ui-context.md`, then Impeccable, then UI UX Pro Max, then the wireframe skill's own taste file.

## Check Before Deciding

1. Magdoub `wireframe`: commit `44a5814` (2026-03-01), MIT, 10 files. `SKILL.md`, `README.md`, the template HTML and its inline script, `self-reveal.css` and `design-taste.md` read in full on 2026-11-21. The script only switches tabs. No network calls in the templates. Polished colour variants may `@import` Google Fonts.
2. Impeccable: commit `b49177d` (2026-11-18), Apache 2.0, version 4.10.0. `SKILL.md`, the README and the launcher's opening read on 2026-11-21. The launcher downloads from `github.com/pbakaus/impeccable/releases`. The 566 KB `live-browser.js` and the binary were not read.
3. UI UX Pro Max: commit `2de1134` (2026-11-19), MIT. `SKILL.md` read in full. Every script import checked on 2026-11-21: standard library only.
4. Paperclip, Collective Brain, MCP Market and Wirekitty: read through their web pages on 2026-11-21. Not installed.

## Decision

- **Chosen:** Magdoub `wireframe` for wireframes, wireframes only by default. Impeccable as the main UI skill, without launcher, live mode, `generate` or hook until the author allows them. UI UX Pro Max as a reference only.
- **Date:** 2026-11-21
- **Decided by:** Claude, as the author asked. The author reviews this note before spec W01.
- **Reason:** see Recommendation.
- **Files updated:** `feature-specs/README.md`, `feature-specs/W-wireframes/`, specs W01a and W01b, `ai-workflow-rules.md`, `AGENTS.md`, `CLAUDE.md`, `ui-context.md`, `progress-tracker.md`
