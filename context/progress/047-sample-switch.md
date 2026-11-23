# 047: Load and Clear Sample Data

Spec: [047](../feature-specs/04-demo-2-the-sample-book/047-sample-switch.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core (the author chose to build folder 04 on this branch and sort out git afterwards)

## What was done

- **A books session in the main process** (`src/main/books-session.ts`) holds which books are open. The real books are `books.db` in the data folder. The sample books are `sample/books.db`, in a folder of their own. Loading builds the sample books into a temporary file and renames it when complete, closes the real books and switches. Clearing deletes only the `sample/` folder and reopens the real books. A failed build, or damaged sample books at launch, leaves no trace.
- **Four bridge functions**, each with a strict Zod schema: `app.getBooksState`, `app.startOwnBooks`, `sample.load` and `sample.clear`. `src/main/build-flags.ts` has the one switch (`SAMPLE_DATA_SWITCH`) that the release build for go-live turns off (spec 150): the main process then refuses both calls.
- **First launch with empty books:** a choice screen, "Start with sample data" or "Start my own books". The second is remembered in the real books (`app_meta`), so the choice does not return.
- **The label:** `PageToolbar` shows "Sample data" beside every page's title while the sample books are open, and the sidebar shows the sample business's name. Loading or clearing remounts the pages so each fetches its figures again.
- **Settings, Developer** (a card, in demo builds only): "Load sample data" and "Clear sample data", with a confirmation that says his own books are not touched.
- **A way to try the app without touching its own data:** an unpackaged run honours `--data-dir=/absolute/path`. The packaged app ignores it.
- The self-check (the packaged app's end-to-end hook) now drives the real screens: it takes the first-launch choice, loads the sample data, looks at five pages for the label, reads the Home numbers, counts the rows of both lists, opens a transaction and closes it with Escape, then clears the sample data and looks again.

## Verified

- `npm run check` passes. `src/main/books-session.test.ts` (15 tests, real temporary folders): the sample books are built in their own folder and the real books keep what was in them (a marker written to them is still there, with no sample rows); clearing deletes only the `sample/` folder (logs and other files in the data folder are untouched); a failed build leaves nothing behind and does not log private text; loading twice, clearing when nothing is loaded, and a build with the switch off are all refused; the sample books are reopened on the next start, ignored when the switch is off, and thrown away if damaged; the first-launch choice is remembered across a restart.
- Renderer tests (`app-shell.test.tsx`): the choice screen, nothing drawn while the state loads, the label on all ten pages, and on a Help guide and the not-found page, no label for his own books, and loading and clearing from Settings.
- **`npm run test:e2e` passes** (2 tests), and "Package check passed: 602 files". The packaged app was driven through the whole flow above: the label on all five pages, four Home numbers in money format, 39 account rows, the panel opening and closing by Escape, then clearing (the label gone, the getting-started list back, no `sample` folder left), with `sample.loaded` and then `sample.cleared` in its log.
- **Run for real, in the built app against a throwaway folder** (Playwright): after loading, the data folder holds `books.db` and a separate `sample/books.db`; after clearing, the `sample` folder is gone. Loading takes about 100 ms. A second launch after "Start my own books" does not show the choice.

## Notes

- The button is called **Clear sample data**, not "Clear all data" as the spec says, because it never clears anything but the sample books, and the name should say so.
- The byte-for-byte fingerprint of the real `books.db` changed across a load and a clear, only because closing the app writes its pending journal into the file (WAL checkpoint). The rows are unchanged, which the session tests check.
- Not checked: the release build's switch turned off (spec 150, folder 12).
