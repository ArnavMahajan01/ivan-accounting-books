# 134: Help: Stars, Tags and Keep on Screen

Spec: [134](../feature-specs/11-demo-9-settings-help-backup/134-help-stars-tags.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- **Where stars and tags are kept:** on this Mac, in `help-prefs.json` beside the window size and appearance (`src/main/help-prefs.ts`, checked with Zod; only guide ids, at most 30 tags of 30 characters). Loading the sample books never loses them.
  - Bridge: `help.prefs`, `help.savePrefs`.
  - Renderer: `HelpPrefsProvider`. The pure changes are in `guides/help-prefs-logic.ts`: a tag typed as "Quarter end" or "#quarter-end" is kept as quarter-end, and a tag no guide is under is dropped.
- **Help list:**
  - a star button beside every guide (with a pressed state);
  - filter chips for All guides, ★ Starred and each of his tags;
  - each guide's tags under its summary;
  - Manage tags, which lists his tags with how many guides each has, and Delete;
  - empty filters say what to do.
- **Reading page:** Star or Starred, Tags… (his tags as ticks, and a box for a new tag), and Keep on screen.
- **Keep on screen** (`guides/KeepOnScreen.tsx`):
  - a solid panel over every page, which stays while he changes page;
  - each step with a tick, and "Drag to move · N of M steps done";
  - drag the title bar, or focus it and use the arrow keys (Shift moves further);
  - make it smaller, or close it. The ticks are only for this time.

## Verified

- `help-prefs.test.ts` (2), `help-prefs-logic.test.ts` (3).
- `help-stars.test.tsx` (3): star and the Starred filter; tag from a guide and the tag filter; the panel's ticks, the arrow keys, smaller, and close.
- `tests/layout/help-prefs.spec.ts` drives the built app, for the e2e check: star, tag, Keep on screen over To review with a tick; then after a restart Starred and #quarter-end still find their guides.
- `npm run check`: 1,316 tests pass. Format is clean.
- Looked at in the built app: the panel over To review at 1280, and the list with a star and a tag after a restart.

**Not checked:** an Impeccable critique of the panel (left for the folder's polish at 141).
