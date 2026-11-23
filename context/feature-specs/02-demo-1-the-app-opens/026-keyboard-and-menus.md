# 026: Keyboard, Focus and Mac Menus

Mac conventions from the start: standard menus, shortcuts for pages, a visible focus ring everywhere.

**Client sees:** the app behaves like a Mac app.

## Depends On

- 025

## Implementation

1. Standard Mac menus (App, File, Edit, View, Window, Help). View lists the pages with ⌘1 to ⌘9.
2. A shortcut registry in the renderer, so shortcuts are listed once and shown in menus and tooltips.
3. Every control reachable by Tab, with a visible focus ring and an accessible name.

## Check When Done

- Every page is reachable by keyboard only. ⌘1 opens Home.
- An accessibility audit (Impeccable `audit`) finds no missing names. `npm run check` passes.
