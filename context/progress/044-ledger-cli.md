# 044: Ledger Command Line for Development

Spec: [044](../feature-specs/03-ledger-core/044-ledger-cli.md)
Status: Done
Date: 2026-11-23
Branch: feature/03-ledger-core

## What was done

- `tools/ledger-cli.ts` (`runCli`, tested in-process), `tools/ledger-run.ts` (the entry) and `tools/vite.ledger.config.ts`. `npm run ledger -- <command> --file <path>` builds the tool with Vite into `dist/ledger/` (git-ignored, never packaged) and runs it. Plain Node cannot resolve the project's path aliases or Vite's migration files, which is why it is built.
- Commands: `init` (migrations, the sample business "Harbour Lane Joinery Pty Ltd" with an invented ABN, and its chart), `trial-balance [--from D] [--to D]`, `check`. Exit codes: 0 done, 1 the books have a problem, 2 used wrongly.
- **It refuses to run without `--file`, and refuses any file inside `~/Library/Application Support`** (where the app keeps its books, including the ` Dev` folder), creating nothing. `trial-balance` and `check` refuse a file that does not exist, so a typo cannot make new books.

## Verified

- `npm run check` passes (533 tests). `tools/ledger-cli.test.ts` covers usage errors, the refused data folder, missing files, bad dates, `init` once and not twice (the account, audit and business counts unchanged the second time), an empty balanced trial balance, trial balances with entries and date ranges, and a corrupted book (exit 1, "Balanced: NO", "Books check FAILED: out-of-balance").
- **The real thing**, run on a temp file in the session scratchpad: no `--file` printed usage and exited 2; `init` printed "Books ready"; `trial-balance` printed "No entries in this range", totals $0.00 and "Balanced: yes"; `check` printed "Books check: ok (0 entries, 0 lines)." and exited 0; a second `init` printed "Not set up: already-set-up" and exited 1; a file under the real data folder was refused and nothing was created.

## Notes

- The description says the tool will "post entries", but the spec's command list has only `init`, `trial-balance` and `check`. I built the list. The sample books with entries come in spec 046.
- `npm run ledger` is in `CLAUDE.md` section 4 and `code-standards.md`.
