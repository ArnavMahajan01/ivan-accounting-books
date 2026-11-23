# 044: Ledger Command Line for Development

A development tool to make a books file, post entries and print the trial balance, before screens exist.

**Client sees:** nothing. Internal.

## Depends On

- 043

## Implementation

1. `tools/ledger-cli.ts`, run as `npm run ledger -- <command> --file <path>`. Refuses to run without `--file`, so it can never touch the real data folder.
2. Commands: `init` (migrations and business setup), `trial-balance --from --to`, `check`.
3. Listed in `code-standards.md`. `tools/` is excluded from the package (checked by 014).

## Check When Done

- `init` then `trial-balance` on a temp file prints an empty, balanced result. No `--file` prints usage and exits with an error.
