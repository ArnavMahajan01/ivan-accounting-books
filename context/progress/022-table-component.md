# 022: Table Component

Spec: [022](../feature-specs/02-demo-1-the-app-opens/022-table-component.md)
Status: Done
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

`src/renderer/components/Table.tsx` and `Table.css`, one table for every list:

- **Columns:** a header, a `cell` renderer, `align: 'end'` for amounts, and an optional `sortValue`.
- **Sorting:** clicking a sortable header sorts ascending, and clicking again sorts descending. `aria-sort` announces it, and an arrow icon shows it. Numbers compare as numbers. Text compares in `en-AU` with numeric order, so "Line 2" comes before "Line 10". `initialSort` sets the starting order.
- **Selection:** optional checkboxes, with the selected keys owned by the parent. The header box selects all or none and shows a half-ticked state when some are selected. Rows carry `aria-selected`, and each checkbox is named from `rowLabel` ("Select Coastal Hardware").
- **Keyboard:**
  - One row is in the tab order, the rest are reached by arrow keys (roving focus).
  - Up and Down move between rows, and Home and End go to the first and last.
  - Space selects the row, and Enter (or a double click) runs `onRowAction`.
- **Scrolling:** the table scrolls inside its own box, `.table-scroll`, whose height the parent sets. The header is sticky.
- **Loading:** skeleton rows shaped like the table (same columns and alignment), with `aria-busy`.
- **The components page** shows 500 invented bank lines (made-up payees such as "Timber Yard Supplies", amounts from a formula), with selection and a row action, plus a loading table.

## Verified

- `npm run check`: typecheck, lint, Vitest "Tests 253 passed (253)". The six Table tests cover:
  - sorting both ways with `aria-sort`, and the initial sort;
  - selecting by checkbox, the half-ticked header, select all and none;
  - arrow keys, Home, End, Space and Enter, with no moving past either end;
  - one tab stop;
  - skeleton rows.
- In Electron, on the components page (renderer dev server), at 1100 wide:
  - 500 rows rendered.
  - Sorting by Amount took 47 ms, to the next painted frame.
  - Thirty arrow presses took 770 ms, including Playwright's own overhead.
  - Space selected a row ("1 selected").
  - The page did not scroll sideways (scroll width 1085, client width 1085).
  - After scrolling 4,000 px inside the table, the header stayed at the top of its box. No page errors.
- Looked at in light and dark: header, amounts aligned right with minus signs, checkboxes, half-ticked header, skeleton rows. All readable.
- **Impeccable review** (single-context, as at 021): no P0 or P1.
  - P3, kept: focus moves by row, not by cell. ARIA allows this for a grid of rows, and it matches To review, where the row is the unit of work.
- **Fixed during the spec:** one test first expected two Tab presses to reach a row. The header's select-all box and two sort buttons come first, so the test now focuses a row by clicking it, as a person would.

## Notes

- No virtualization. 500 rows are smooth. Revisit if a real account goes past a few thousand lines in one view.
