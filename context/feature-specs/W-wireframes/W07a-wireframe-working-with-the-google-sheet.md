# W07a: Wireframe: Working With the Google Sheet

Wireframes for free-form spreadsheet work: the real Google Sheet in a panel inside the app (optional), the real sheet beside the app in Chrome, a sheet-style preview before publishing, a Ready formulas tab, and a map of which tabs are the app's and which are his. Added on 2026-11-22 at the author's request: the client wants free-form sheets with rows, columns, formulas and conditions, plus ready-made formulas.

Part of the client review pack. It follows W07 and comes before the W10 meeting.

## Depends On

- W07

## Implementation

1. Make 5 black-and-white options in `wireframe/2211-working-with-the-google-sheet/` with the wireframe skill, Wireframes only.
2. Cover: the in-app panel opened, and the state where it could not open with Chrome offered; Chrome side by side; a preview of exactly what Google will get; ready formulas with plain explanations; his own columns and tabs never overwritten.
3. Invented data only, matching W03 to W09.
4. Add it to `wireframe/index.html`, and a section to `context/wireframe-feedback.md`.

## Scope Limits

- As the author asked, the in-app panel shows no security warning. The plain fallback state is kept, so it is never a dead end. The risk is recorded as G7 in `security-risks.md`.
- Nothing typed in a sheet changes the books. Edits to allowed columns come back as proposals (W07).

## Builds Into

- Specs 109 to 113, 118 and 119.

## Check When Done

- The wireframe opens from `wireframe/index.html` and every tab works.
- The author has clicked through all 5 options.
