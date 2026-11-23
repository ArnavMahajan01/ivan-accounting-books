# 026: Keyboard, Focus and Mac Menus

Spec: [026](../feature-specs/02-demo-1-the-app-opens/026-keyboard-and-menus.md)
Status: Done (Impeccable skill not run, see Notes)
Date: 2026-11-23
Branch: feature/02-demo-1-the-app-opens

## What was done

- **One list of pages and shortcuts.** `src/shared/pages.ts` lists the ten pages once. `src/shared/shortcuts.ts` lists every shortcut once: Command-1 to Command-9 for the first nine pages, Command-? for Help, Control-Command-S for the sidebar. It also formats them for tooltips (`⌘1`) and for the menu (`Cmd+1`), and matches key presses.
- **Where the spec said "in the renderer":** the list is in `src/shared/`, because the Mac menu in the main process needs the same list, and `main` may not import `renderer`. The renderer takes its key handling from it (`src/renderer/layout/use-shortcuts.ts`).
- **Mac menu** (`src/main/menu.ts`): App, File, Edit, View, Window, Help. View lists the pages with their shortcuts. The Help menu has "Accounting Books Help". Before, only the packaged app had a menu (App, Edit, Window, no View). Now a development run has the same menu plus Reload and Developer Tools in View. The packaged app has neither.
- A menu item opens its page by changing the address hash of the window. No new bridge function or message channel was added.
- `src/renderer/routes.ts` now builds on `@shared/pages` (it adds the icons). The sidebar items show their shortcut in the tooltip, and the sidebar button's tooltip reads from the same list.
- The Control-Command-S handler moved from `AppLayout` into the same hook, so all shortcuts are handled in one place.

## Verified

- `npm run check`: typecheck (both configs), lint and Vitest "Tests 354 passed (354)" at the end of 028. New tests for this spec: `shortcuts.test.ts`, `menu.test.ts`, the page shortcut tests in `layout.test.tsx`, and a test over all 10 pages that every button, link and text box has an accessible name and none is taken out of Tab order.
- The real app (development build, driven by a throwaway Playwright script):
  - the menu bar has App, File, Edit, View, Window, Help;
  - View lists Home to Settings with Cmd+1 to Cmd+9, and Help has "Accounting Books Help" with Cmd+?;
  - choosing Bank, Settings, Home and Help from the menu moved the window to `#/bank`, `#/settings`, `#/home` and `#/help` and showed that page's heading;
  - pressing Command-3 moved to Bank.
- **Keyboard only:** on each of the 10 pages, Tab visited every control (11 stops on the empty pages: the sidebar button and the 10 page links; 13 on Help). Every stop had a name and a visible focus ring (`outline` set), and there were no page errors.
- `npm run format:check`: clean. `npm run test:e2e`: "2 passed", and "Package check passed: 602 files".

Not checked: pressing a shortcut on the packaged app by hand (the packaged app refuses debugging, so only its self-check was run), and the macOS look of the Cmd+? label in the Help menu.

## Notes

- **Impeccable `audit`:** the skill was not run. The checks above stand in for its accessibility part (names, Tab order, focus rings). The author may want to run `/impeccable audit` once on the whole app before Demo 1.
- Command-? is the Mac's own Help key. Settings does not get Command-, (the Mac habit) because the spec asks for Command-1 to Command-9. Say if the client would like it too.
- Pages added in later folders (Rules, Invoices, Contacts) join `src/shared/pages.ts`. Only the first nine get a number.
