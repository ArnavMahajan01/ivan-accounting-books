# 024: App Layout: Window, Sidebar and Toolbar

Spec: [024](../feature-specs/02-demo-1-the-app-opens/024-app-layout.md)
Status: Done. The author's own look is pending
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

- **`src/renderer/routes.ts`:** the ten routes in the signed-off sidebar order (Home, To review, Bank, Transactions, Accounts, Reports, Shared sheets, Accountant changes, then Settings and Help at the bottom), each with a Lucide icon. `routeFromHash` reads `#/bank` style addresses, and anything else is Home.
- **`src/renderer/use-route.ts`:** a small hash router. Back, forward and reload keep the page. No router library was added for ten fixed pages.
- **`src/renderer/layout/Sidebar.tsx`:**
  - Glass (`--color-glass` with a blur) over the app's own background, 232 wide, inside an 8 px margin.
  - The title at the top is "Accounting Books" until the business name exists (spec 030).
  - Links (`<a href="#/...">`) inside `<nav aria-label="Main">`. The current page has `aria-current="page"` and the brand colour.
  - Count badges show only above zero. When collapsed it shows icons only, with each link keeping its name ("To review, 37") and a dot for a count.
- **`src/renderer/layout/AppLayout.tsx`:**
  - The sidebar beside the page. The page scrolls in its own column, so the sidebar stays in view.
  - Collapsing works by the toggle button and by Control-Command-S (as in Finder and Mail), and is remembered in the window's `localStorage`, guarded for when storage is unavailable.
- **`src/renderer/layout/PageToolbar.tsx`:** the title as the page's `<h1>` on the left; on the right, a status slot (for the Sample data label), other actions, then at most one main action.
- **`src/main/window-state.ts`:**
  - The window's size and place are saved to `window-state.json` in the data folder (mode `0600`) when it closes, unless minimized or full screen.
  - They are read back with Zod, and ignored if invalid, smaller than 1100 by 700, or not at least 100 by 100 on a current screen (for example an unplugged display).
  - The first launch opens at 1280 by 800. The minimum stays 1100 by 700.
- **`App.tsx`:** the layout plus each page's toolbar. Home keeps the version and books-status lines (read by the end-to-end self-check) until spec 025 gives Home its real content.

## Verified

- `npm run check`: Vitest "Tests 269 passed (269)". New tests:
  - routes: the address read, and the sidebar order;
  - the sidebar: 10 links, the current page, counts above zero only, names when collapsed;
  - the layout: collapse by button and shortcut, remembered after remounting;
  - the toolbar heading;
  - window state: save and load, invalid files, an unplugged screen, the 100 by 100 rule.
- The built app in Electron:
  - Clicking each of the ten sidebar items opened its page with the matching `<h1>` and `aria-current="page"`, using Playwright checks that wait. Back went to the previous page, and reload kept it.
  - No page errors, and no sideways scrolling.
  - Control-Command-S toggled the sidebar.
  - After setting the window to 1300 by 820 at (60, 50), closing it and launching again, it opened at exactly that size and place.
- Looked at (screenshots): 1100 by 700 and 1440 by 900, light and dark, and collapsed. The sidebar reads clearly over the background, the current item is in the brand colour, the bottom items sit at the bottom, and the page title is on the left.
- `npm run test:e2e`: the package check passed, "2 passed".
- **Impeccable review** (single-context): no P0 or P1. The glass sidebar is the brief's own choice (`ui-context.md`), drawn over the app background as 020 requires.
  - P2, for 025: Home shows only the toolbar and the two status lines until the Next Steps layout arrives.

Not checked: the author's own look at both sizes and themes. Run `npm run dev`.

## Notes

- One check script first read the heading straight after each click and saw the previous page's title. The page was fine; the script was too quick. It was replaced with checks that wait.
