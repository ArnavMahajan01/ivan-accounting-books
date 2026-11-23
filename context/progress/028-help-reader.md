# 028: Help: Guide List, Search and Reader

Spec: [028](../feature-specs/02-demo-1-the-app-opens/028-help-reader.md)
Status: Done (Impeccable skill not run, see Notes)
Date: 2026-11-23
Branch: feature/02-demo-1-the-app-opens

## What was done

- **Help page** (`src/renderer/pages/HelpPage.tsx`): the list of guides grouped by feature with a search box, and the reading page for one guide with an **All guides** back button. Both are at `#/help` and `#/help/<guide id>`, so back and forward work. An unknown guide shows "That guide does not exist" and a way back. With no guides at all, an empty state.
- **Search** (`src/renderer/guides/search.ts`): every word of the query must appear somewhere in a guide (title, group, summary, headings, paragraphs, steps, image descriptions), in any case. It says how many guides match, and when none do, offers **Clear search**.
- **Offline:** the guides are bundled into the app by the build (`src/renderer/guides/load-guides.ts`), so no file is read and nothing is fetched. The built JavaScript contains the guide.
- **Reading page:** a solid surface, 72 characters wide, steps as a numbered list, images (when a guide has them) with their description as alt text, and long words wrap. When a guide opens after a click, focus moves to the page without scrolling.
- `routes.ts` now reads the guide from an address like `#/help/getting-started`. A new `useHash` hook gives the current address. Help is no longer an empty page (`EmptyPage`).

## Verified

- `npm run check`: Vitest "Tests 354 passed (354)", lint and both typechecks clean. New tests cover the list, grouping, search (including a word only in a step: "question" finds Getting started), no match and Clear search, no guides, opening and going back, an unknown guide, text shown as text, a very long word, and focus.
- **Check "Search finds Getting started by a word in its steps":** done two ways: the unit test above, and in the real app, typing "question" into the box showed "1 guide matches" and Getting started.
- The real app, looked at (screenshots) at 1100 by 700 and 1440 wide, light and dark: the list, a search with no match, the reading page and the unknown guide.
  - **Found and fixed:** a guide opened part way down the page, with its title and back button out of sight, because focusing the tall page scrolled it. Focus now uses `preventScroll`.
  - A black button in one light screenshot was a screenshot taken during the 200 ms colour change after switching theme. A second run, with a wait, showed the button correctly.
- Keyboard only: Tab reaches the search box and the guide link on Help, every control has a name and a focus ring.
- `npm run format:check` clean. `npm run test:e2e`: "2 passed", "Package check passed: 602 files".

Not checked: the packaged app's Help by eye (only its self-check ran). Opening a guide with an image in the real app (there is none yet).

## Notes

- **Impeccable `critique` and `audit`:** the skill was not run. I reviewed the page myself against `ui-context.md` and `design-rules.md` (tokens only, a solid surface, every state, keyboard, focus rings), and found no P0 or P1 beyond the scroll bug above. The author may want the skill run once for Demo 1.
- Going back to the list clears the search. The Admin Dashboard's Help was not checked for what it does here. Say if the client would want it kept.
- The search box is a plain styled `input` in `HelpPage.css`. Spec 134 (tags) and later forms may want a shared text field component.
- Not in this spec, so not built: stars, tags, Keep on screen (134), the **?** button on each page (135).
