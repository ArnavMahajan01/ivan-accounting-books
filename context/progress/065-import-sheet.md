# 065: Import Preview Sheet

Spec: [065](../feature-specs/05-demo-3-bank-import/065-import-sheet.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/renderer/import/ImportSheet.tsx` and `import-text.ts`: the sheet from wireframe W04 Option 5, in plain sentences: which account and days, how many new lines go to To review, how many are already in the books and will be skipped, which lines could not be read and why ("line 81 has the date \"31/11/2026\", which is not a real date"), the closing balance as a tick, a mark or a plain note (always with words), **See all lines** (closed, with a **Show** filter and the first 200 lines), **Cancel** and **Import N lines**. After importing: "N lines added to To review" with **Go to To review**. When nothing is new, **Close** is the only action. A file turned away says why in a sentence.
- Added a `New` badge to the badge list.
- The packaged app's self-check can now "choose" a queue of statement files (`--self-check-statement=<path>`, honoured only while the self-check itself runs), so the end-to-end test can drive the real import without the Mac's file chooser.

## Verified

- The three states from the wireframe, seen with the fixtures in the real app: clean (first file), duplicates and a match (the overlap file), and a problem (the bad-date file, with the difference named as the unreadable line). Screens were looked at in light and dark and at 1100 by 700.
- End-to-end test (`tests/e2e/packaged-app.spec.ts`), in the packaged app: the four files go in; after the first the sidebar says `To review11`, after the overlap `18`, after the problem file `21`; the Bank page then shows 21 lines and the last statement $20,898.35 as at 23/11/2026; the log holds no descriptions. `npm run test:e2e`: package check passed with 608 files, "2 passed".
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- The first file for an account shows "First file for this account" instead of a tick (see 061). Impeccable `critique` and `audit` were run afterwards (see 064). The `Duplicate` badge now reads "Duplicate · skipped", as in the wireframe, and the sheet's text no longer leaves one word alone on a line.
