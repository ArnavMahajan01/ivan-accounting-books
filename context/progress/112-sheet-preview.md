# 112: Sheet-Style Preview Before Publishing

Spec: [112](../feature-specs/09-demo-7-google-sheets/112-sheet-preview.md)
Status: Implemented, check deferred (the cell-for-cell comparison needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `src/services/sheet-preview.ts` and bridge `sheets.preview`: the same content the publish sends (one code path, `workbookContent`), with each cell's text as the sheet shows it (`shownText`, moved into `src/domain/workbook.ts`), whether it makes a new workbook, updates the one already published (with its date), or replaces one that has gone, and his tabs as they were at the last publish. Reads only the books and the stored link, so it works offline.
- `src/renderer/sheets/SheetGrid.tsx`: a read-only grid with column letters, row numbers, figures on the right, the tabs along the bottom (his own greyed, "left as it is"). A heading with nothing beside it runs on over the empty cells, as in Sheets, without widening column A.
- `PublishSheet` (a wide sheet, W07a Option 3): "Goes to: …", "Tabs: …", "Kept as they are: …", the grid, "Preview only. Nothing is sent until you click Publish." Publish is turned off with a link to Settings while Google is not connected. `Sheet` gained a `wide` size.
- **Choice made where the spec left room:** the wireframe drew the preview beside the report; it is in a wide sheet over the report, so it has the room a sheet needs at 1100 wide.

## Verified

- `publish.test.tsx`: the grid's column letters, a figure on the right, the tabs, the "nothing is sent" line; Publish off while not connected.
- In the built app with `GOOGLE_FAKE=1` at 1100 (profit and loss) and 1440 (transactions), light theme: looked at. The first look showed column A stretched by the long heading row; fixed so the heading runs over the empty cells.

**Not checked:** the preview against the real published sheet cell for cell (needs spec 106); Impeccable `critique` of the preview runs with the folder's pass before Demo 7. A Ready formulas example shows its formula in the preview, where Sheets shows the result.
