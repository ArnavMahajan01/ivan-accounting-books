# 045: Ledger Core Verification

Spec: [045](../feature-specs/03-ledger-core/045-ledger-verify.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- Ran the whole verification of the ledger core, and recorded it here. Updated the risk register, the `check-invariants` skill (invariants 1, 3 and 6 now point at the tests that exist), `architecture-context.md` (the data model as built, and the spec 040 decision), `code-standards.md`, `CLAUDE.md` and the tracker.

## Verified

- `npm run check`: typecheck (both configs), lint with no warnings, and Vitest "Tests 534 passed (534)" in 56 files. `npm run format:check`: clean.
- `npm run test:e2e` (which runs `npm run package` first): "Package check passed: 602 files in release/mac-arm64/Accounting Books.app, none with a private or development file", and "2 passed". The packaged app opened its books, ran the books check and logged `books.checked`.
- **`check-invariants`, run on 2026-11-23:**

| # | Invariant | Result |
|---|---|---|
| 1 | Every entry's lines sum to zero | Pass. `validateEntry`, `postEntry` (checks again after writing), the trial balance and books check tests |
| 2 | Integer cents, no floats | Pass. Lint, and the search found nothing in `domain`, `data`, `services` or `money.ts` |
| 3 | Only the posting service writes entries and lines, with an audit row in the same transaction | Pass. `tools/single-writer.test.ts`, the search finds nothing, and every post, change and removal is tested with its audit row and rollback |
| 4 | An imported file never stores a line twice | Not built yet (spec 060) |
| 5 | SQLite is the only truth, nothing from Google changes the ledger | Not applicable yet (folder 09). No Google code exists |
| 6 | Nothing changes on or before the lock date | Pass for what exists: post, change and remove all refuse it, with tests. Setting the lock date is spec 096 |
| 7 | `domain` and `import` are pure | Pass. Lint and the search found nothing |
| 8 | The renderer only calls named bridge functions, validated with Zod | Pass. `books.getHealth` has a strict empty-input schema, and the renderer imports nothing from `data`, `services` or `main` |
| 9 | No client-specific value in code | Pass. The only hits are the ABN rule's own test (the ABR's published example number) and invented values |
| 10 | Data leaves the Mac only through the client's action | Pass. The one network hit is the expected `net.fetch` of the app's own files |

- Risk register (`security-risks.md`): L1, L2 and L4 marked fixed with their spec numbers, and "Last reviewed" set to 2026-11-23.

## Notes

- **Open for the author (nothing blocks the ledger core, but these are not done):** review the chart template (032) and its default tax codes (034); confirm the spec 040 decision; run Impeccable on Demo 1 (026 to 028).
- **Spec 029 (Demo 1) was not done** at the author's instruction to do the ledger core first. Its checks, polish and demo script remain.
