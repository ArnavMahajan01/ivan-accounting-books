# 004: Result Type and Literal Kinds

Spec: [004](../feature-specs/00-foundations/004-result-and-kinds.md)
Status: Done
Date: 2026-11-22
Branch: feature/00-foundations

## What was done

- `src/shared/result.ts`: `Result<T, E>`, a union of `{ ok: true, value }` and `{ ok: false, error }` with read-only fields. `ok(value)`, `err(error)` and `mapResult(result, transform)`, which leaves a failure unchanged and does not call the transform.
- `src/shared/kinds.ts`: `ACCOUNT_TYPES` (`asset`, `liability`, `equity`, `income`, `expense`), the `AccountType` union made from it, and `isAccountType` to check a string, for example a row read from SQLite.
- `assertNever(value: never)` in `kinds.ts`. `code-standards.md` asks for an exhaustiveness check at the end of every `switch` over a kind. This is the one helper for it, and `code-standards.md` now names it. It throws, because reaching it is a bug, not an expected failure.
- Tests: `result.test.ts` (5) and `kinds.test.ts` (4), next to the code.
- `src/shared/index.ts` still exports nothing. Code imports `@shared/result` and `@shared/kinds` directly.

## Verified

- `npm run check`: typecheck passed, lint passed, Vitest "Test Files 3 passed (3), Tests 10 passed (10)".
- A test narrows with `if (r.ok)` and checks the narrowed type with `expectTypeOf(r.value).toEqualTypeOf<number>()`. Typecheck accepts it.
- The types catch mistakes. A throwaway `src/shared/tmp-types.ts`, deleted after the check, gave from `npx tsc --noEmit`:
  - a switch with the `income` case missing: `error TS2345: Argument of type '"income"' is not assignable to parameter of type 'never'`.
  - `r.value` read without checking `r.ok`: `error TS2339: Property 'value' does not exist on type 'Result<number, string>'`.

## Notes

- 001's trivial `setup.test.ts` was already replaced at 002 by `alias.test.ts`, which stays as a guard of the alias set-up.
- The test's `normalSide` switch is an example only. The real normal-balance rule belongs to the chart of accounts in folder 03.
