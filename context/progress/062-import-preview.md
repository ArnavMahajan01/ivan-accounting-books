# 062: Import Preview Service

Spec: [062](../feature-specs/05-demo-3-bank-import/062-import-preview.md)
Status: Done
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `src/services/import-file.ts` `previewImport(ctx, {fileName, text})`: reads the text, matches the account from the last four digits (one active account; none, several or an inactive one is refused with the digits), marks each line new or already held, and runs the balance check. It writes nothing. `importPreviewView` turns the result into what the screen shows.
- `src/main/statement-files.ts`: the main process checks the path is a plain file under the limit, reads it, and decodes UTF-8 or Windows-1252.
- `src/main/preview-store.ts`: the last five previews are held in memory only, and forgotten when the books change or the app quits.
- Bridge functions `bank.chooseAndPreview` (the Mac file chooser, then the preview), `bank.previewFile` (a path) and `review.getCount`. The preload exposes `pathForFile` for a dropped file, the one thing a screen cannot do for itself. A refusal is an answer, not a bridge error, and holds a reason code and the last four digits only.

## Verified

- `src/services/import-file.test.ts` (18 tests, run against the sample books and every fixture): a clean file, the account matched from its digits, a file for another account refused with `9999`, a deactivated account, empty, no transactions and a stranger refused, only the file's name kept, the XML form giving the same lines as the text form. Nothing is written by a preview.
- `src/main/import-handlers.test.ts` (8), `src/main/statement-files.test.ts` (5), and 10 input checks added to `bridge.test.ts` (an empty or very long path, an extra key, a bad preview id).
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- Risk U3 was added to `security-risks.md`: a compromised screen could ask the main process to read any file. It gets back a reason code at most, never content, and a test shows that.
- The file chooser offers `.ofx` and `.qbo` (Westpac's QBO is OFX with another name) and "All files". A file is recognised by what is in it.
