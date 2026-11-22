# 025: Every Page With Its Empty State

Spec: [025](../feature-specs/02-demo-1-the-app-opens/025-empty-pages.md)
Status: Done
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

- `src/renderer/pages/`: one component per page, chosen by `Page` in `pages.tsx`. The switch ends with `assertNever`.
  - **Home** (`HomePage.tsx`):
    - the "Brand-new book" state of Option 2, Next Steps: a numbered "Getting started" list in the wireframe's words (business details, bank accounts, "No bank lines yet. Download a statement file (OFX or CSV) from Westpac Online Banking, then import it.", and "Connect Google: only needed when you want to share sheets with your accountant");
    - each item marked "Coming in a later version.";
    - the toolbar's one main action, **Import file**, disabled for now;
    - a plain error at the top if the books could not be opened.
  - **Settings** (`SettingsPage.tsx`): Option 3, Status Cards, with Backups and Google first, as the wireframe asks, then Business, Bank accounts, Appearance, and the working About card (version, schema version and integrity).
  - **To review, Bank, Transactions, Accounts, Reports, Shared sheets, Accountant changes and Help** (`EmptyPage.tsx`): the toolbar, then an `EmptyState` with an icon, one sentence saying what the page will hold, and "Coming in a later version."
- `EmptyState` gained an optional `note`. `.page-surface` (a solid surface, card radius) is in `styles.css`.
- `src/renderer/pages/use-bridge.ts` and `data-status.ts`: the shared `useBridge` hook and the status loaders, moved out of `App.tsx`. `App.tsx` is now just the layout and the page.
- `src/renderer/bridge.ts`: `bridge()` is now a function that reads `window.bridge` when called. Before, it was read once at load, which broke tests that provide a stand-in bridge. The `react-renderer` and `electron` skills were updated to match.
- `src/main/self-check.ts`: the self-check now opens Settings before reading the version and books status lines, since they moved from Home to the About card.

## Verified

- `npm run check`: Vitest "Tests 289 passed (289)". New page tests (with a stand-in `window.bridge`):
  - all 10 pages show their title as the `<h1>`;
  - the 8 unbuilt pages say "Coming in a later version.";
  - Home has the 4-step Getting started list, the Westpac sentence, and exactly one main action;
  - Settings' About card shows the version and the books status.
- The built app, at 1100 by 700:
  - Home, Settings and To review, in light and dark: no page errors.
  - Looked at (screenshots): Home's list reads as the wireframe's brand-new book, Settings' cards are in two columns, and To review's empty state is centred on a solid surface.
- `npm run test:e2e`: "2 passed", with the self-check reading from Settings. `npm run format:check`: clean.
- **Impeccable review** (single-context): no P0 or P1.
  - P2, fixed: Settings first showed About ahead of Backups and Google, against the wireframe's order.

## Notes

- **Where the wording came from:** the wireframes drew an empty state only for Home. The other pages were drawn full of sample data. So their sentences were written in `ui-context.md`'s empty-state style (what will appear, and what to do), and the author may want to read them.
- The pages fill in from folder 03 on.
