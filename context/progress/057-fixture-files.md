# 057: Invented Westpac Files for Tests and Demos

Spec: [057](../feature-specs/05-demo-3-bank-import/057-fixture-files.md)
Status: Done (the author's look at the files pending)
Date: 2026-11-24
Branch: feature/05-demo-3-bank-import

## What was done

- `tests/fixtures/westpac/`: eight invented OFX files and a README that says what each is for: Business One clean (2 to 13 November, 11 lines), the same lines as XML OFX, Business One overlapping (9 to 20 November, 13 lines, 6 of them in the first), Business One with a bad date (16 to 23 November), Cash Reserve, a file for an account that is not his, a statement with no transactions, and an empty file. `huge-ofx.ts` writes a 10,000-line file when a test needs one, so the repository does not carry a megabyte.
- The Business One lines are the November movements of the sample books, written the way a bank words them, so the demo reads true. The balances are real arithmetic: 20 November closes at the sample books' $18,642.35 and 1 November opens at the sample ledger's balance, and a test (`import-file.test.ts`, "agrees with the sample books") fails if the sample data and the files drift apart.
- Account numbers (`100004821`, `100007730`, `100009999`) and the BSB are invented. No file came from a real bank file.
- CSV versions were not made: the header row is not known (client question 16).

## Verified

- Every fixture is used by a test (`ofx.test.ts`, `import-file.test.ts`, `import-handlers.test.ts`, the packaged-app test). The consistency test above passes.
- `npm run check` (typecheck of both configs, lint with no warnings, Vitest): "Tests 863 passed (863)" in 80 files at the end of folder 05. `npm run format:check`: clean.

## Notes

- **The check item "the author has looked" is open:** the files are listed in the README for the author to read. They are plain text.
- The format follows the public OFX specification (text layout 1.x and XML layout 2.x). No real Westpac OFX file has been seen, so the real layout is a risk: client questions 31 and 32.
