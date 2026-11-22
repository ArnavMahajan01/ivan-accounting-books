# 004: Result Type and Literal Kinds

Adds the `Result` type every expected failure is returned as, and the literal unions for statuses and kinds, so no code throws for expected errors or uses loose strings.

**Client sees:** nothing. Internal.

## Depends On

- 003

## Implementation

1. `src/shared/result.ts`: `Result<T, E>` as a discriminated union, with `ok(value)`, `err(error)` and a `mapResult` helper.
2. `src/shared/kinds.ts`: the literal unions named in `code-standards.md`, starting with `AccountType` (`asset`, `liability`, `equity`, `income`, `expense`). Later specs add their own kinds here.
3. Tests for each helper.

## Check When Done

- A test narrows a `Result` with `if (r.ok)` and TypeScript accepts it.
- `npm run check` passes.
