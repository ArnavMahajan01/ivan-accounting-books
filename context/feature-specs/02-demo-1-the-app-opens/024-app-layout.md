# 024: App Layout: Window, Sidebar and Toolbar

The frame every page sits in, matching the signed-off wireframe: the glass sidebar with its sections and counts, and the toolbar with the one main action.

**Client sees:** the real window and sidebar from the wireframes.

## Depends On

- 023

## Implementation

1. Sidebar (232 wide, glass, collapsible) with the items in `ui-context.md` ("Layout"), as signed off at W11. Settings and Help at the bottom. Count badges supported.
2. A router: one route per sidebar item. The selected item shows in the brand colour.
3. `PageToolbar`: title left, actions right, at most one main action.
4. Minimum window 1100 by 700. Window size and sidebar state remembered.

## Check When Done

- Every sidebar item opens its route. Collapsing the sidebar works by mouse and keyboard.
- Looked at by the author at 1100 by 700 and 1440 wide, both themes.
- Impeccable `critique` and `audit`, P0 and P1 fixed. `npm run check` passes.
