# 023: Empty State, Sheet, Confirm and Sample Data Label

Spec: [023](../feature-specs/02-demo-1-the-app-opens/023-feedback-components.md)
Status: Done
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

`src/renderer/components/`, each with its CSS file using tokens only:

- **`EmptyState`:** a Lucide icon (32 px), one sentence (at most 48 characters wide) and an optional next action.
- **`Sheet`:**
  - A Mac-style panel that drops from the top of the window over a dimmed page, rendered in a portal on `document.body`, with `aria-modal`, a labelled title and an optional description.
  - When it opens, it focuses the first control. Tab and Shift+Tab stay inside, Escape closes it, and focus returns to whatever opened it.
  - It rises in 0.2 s, and the reduced motion setting removes that.
  - It was built rather than using `<dialog>`, so focus behaviour is the same everywhere and can be tested in jsdom.
- **`ConfirmDialog`:**
  - An `alertdialog` on `Sheet`: the title, then what will change in plain words.
  - Cancel comes first and has focus, then the action named in words ("Stop sharing", never "OK"), shown as `destructive` when it removes something.
- **`ErrorMessage`:** `role="alert"`, an error icon, plain words, and an optional "Try again".
- **`SampleDataLabel`:** "Sample data" in words with an icon, in the warning colour (as `ui-context.md` "Badges" says), and a tooltip saying the figures are invented.
- **New token `--color-scrim`**, one per theme, for the dimmed page behind a sheet (see Notes).
- All five are on the components page, which has buttons to open a sheet and a confirmation.

## Verified

- `npm run check`: Vitest "Tests 259 passed (259)". The six new tests cover:
  - the sheet focusing its first control;
  - Tab cycling through input, Cancel and Split back to the input, and Shift+Tab going the other way;
  - Escape calling close and focus returning to the opener;
  - the confirmation's role, name and description, with Cancel focused, the destructive style, and Escape and confirm working;
  - the empty state's sentence and action, the error as an alert with a working retry, and the sample label.
- In Electron (components page, renderer dev server), light and dark: opening the confirmation focused "Cancel", and Escape returned focus to "Open a confirmation". No page errors.
- Looked at both themes with the confirmation open: readable, the destructive action in words and in the error colour, and the page behind dimmed.
- **Impeccable review** (single-context, as at 021): no P0 or P1.
  - P2, fixed: in dark mode the backdrop lightened the page, because it was mixed from the text colour, which is light in dark mode. It now uses `--color-scrim` (24% dark teal in light, 50% black in dark).
  - P3, noted: when a sheet is opened by mouse, Chromium shows no focus ring on the focused Cancel button (`:focus-visible` follows how the sheet was opened). This is the platform's normal behaviour, so it was left.

## Notes

- `ConfirmDialog` is for actions with no undo. Where an undo exists (`ui-context.md`, "Destructive actions"), use it instead of asking.
