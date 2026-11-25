# 065a: Undo an Import, on the Bank Page

Spec: [065a](../feature-specs/05-demo-3-bank-import/065a-undo-import-screen.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- Under the accounts table, a **Last import** list: for each account whose last import can be taken back, the file's name, how many lines it added and its days, and an **Undo import** button (named for the file, for a screen reader).
- The button opens a confirmation (`ConfirmDialog`, Cancel focused first, the action in words, styled as destructive): "Undo this import?", how many lines leave To review, and that the file stays where it is and can be imported again.
- After it, a short notice (a status line) says how many lines were removed, the table and the sidebar's count are asked for again, and a refusal says why in a sentence.
- The guide gained "If you brought in the wrong file".

## Verified

- `src/renderer/pages/bank.test.tsx`: 13 tests, 6 of them new: the list and button, nothing shown when there is nothing to take back, the question and Cancel, confirming (the notice and the new figures asked for), a refusal in words, and a bridge failure.
- The packaged app (end-to-end test): after four files are imported, the last (3 lines) is taken back from the Bank page and the sidebar goes from `To review21` to `To review18`; the log has `import.undone` and no descriptions.
- Seen in the real app in light and dark: the list, the confirmation and the notice. Impeccable's detector reports 0 findings on the Bank page, the confirmation and the done sheet.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 885 passed (885)" in 81 files. `npm run format:check`: clean. `npm run test:e2e`: package check passed, "2 passed".

## Notes

- Only the latest import of each account, as in 063a. There is no list of past imports.
