# 135: Help: "?" on Each Page

Spec: [135](../feature-specs/11-demo-9-settings-help-backup/135-help-per-page.md)
Status: Done
Date: 2026-11-28
Branch: feature/11-demo-9-settings-help-backup

## What was done

- `src/renderer/guides/page-guides.ts`: each page names its guide (`PAGE_GUIDES`). The BAS worksheet, closing a quarter and his own reports open their own guides (`guideForPage`).
- `PageToolbar` shows a **Help** button (accessible name "Help for this page") on every page but Help itself. It opens the page's guide in a panel at the right, over the page (`guides/PageHelp.tsx`), with **All guides** (opens Help) and **Keep on screen** (spec 134). Escape or ✕ closes it, and focus goes back.
- The guide's sections, steps and images moved into `guides/GuideBody.tsx`, used by Help's reading page and the panel, so the two always agree.

## Verified

- `page-guides.test.ts`: every page's guide exists (and none for Help); the report pages open their own guide.
- `npm run check`: 1,318 tests pass, Help's own tests unchanged. Format is clean.
- `npm run test:layout` passes, now with the page's guide open over To review at the four sizes. I looked at it at 1100, and at the profit and loss toolbar, the busiest one, with the new button.

**Not checked:** an Impeccable critique of the panel, left for 141. When spec 140 adds "Change your settings", Settings should open that guide instead of Getting started (a one-line change in `PAGE_GUIDES`).
