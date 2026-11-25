# 064: Bank Page

Spec: [064](../feature-specs/05-demo-3-bank-import/064-bank-page.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/renderer/pages/BankPage.tsx`: a table of his accounts (name, in your books, last statement with its day, lines to review as a link, reconciled), a sub-account under its account, **Import file** as the one main action, a drop zone, and a line pointing to the guide while no line has been imported. It handles loading, no accounts and an error.
- `src/renderer/import/ImportProvider.tsx`: the whole import flow for the window. A file dropped anywhere opens the same sheet on the Bank page, with a message over the window while it is dragged. A drop of two files asks for one at a time. The window never navigates to a dropped file.
- Home's **Import file** now works (it was switched off), and Home's **Bank balance** opens the Bank page. The sidebar's To review shows the count of imported lines, and the To review page says how many are waiting.
- `src/main/handlers.ts` and `src/services/get-bank-view.ts` give the page its figures.
- Found and fixed in the shared `Sheet` while looking at it in the real app: a field inside a closed "See all lines" section was taken as the first thing to focus, so no focus landed in the sheet and Tab did not wrap. `Sheet` now skips anything hidden and includes `summary`. Import file is no longer disabled while a file is read, because a disabled button loses focus and the sheet could not give it back.

## Verified

- `src/renderer/pages/bank.test.tsx` (7), `src/renderer/import/import-flow.test.tsx` (18, with the sheet and the drop), Home (11), the app shell (14, with the sidebar count), the Sheet (9, with the two focus cases).
- Looked at in the real app (built, run with Playwright and a throwaway data folder) at 1440 and at 1100 by 700, in light and dark. Dropping was tried with an event carrying a file with no path on disk (the sheet says it could not be opened) and the window did not navigate. By keyboard: focus lands in the sheet, Tab cycles inside it, every stop has a focus ring, Escape closes it, and focus returns to Import file.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- **Not checked: dropping a real file from Finder.** An automated test cannot drag a file from the desktop, so `webUtils.getPathForFile` was not seen working with a real drop. The first time the author drags a file in, that is what to watch.
- **Impeccable `critique` and `audit` were run afterwards, on 2026-11-24** (they were first skipped, which the spec's check list does not allow). Single-context run, because this session starts sub-agents only when asked. Critique 28/40 (Good), audit 17/20 (Good). Two P1 found and fixed: the "Sample data" label measured 3.9 to 1 against the page colour (it now sits on the surface colour), and keyboard focus fell out of the sheet when the preview became its result (the shared `Sheet` now puts focus back inside when its title changes; tested, and checked in the real app). The detector, run against the live window, then reported 0 findings. The reports are in `.impeccable/critique/` and `.impeccable/audit/`. The P2 items are in the tracker.
- The file chooser and the Bank page offer OFX only, until the CSV reader exists.
