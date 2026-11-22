// Literal unions for every status and kind, so no code compares loose strings
// (context/code-standards.md). Later specs add their own kinds here.

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/** The prefix of each kind of id (context/code-standards.md, "Ids"). Later specs add theirs here. */
export const ID_KINDS = ['acc', 'ent', 'lin', 'stl', 'imp'] as const;
export type IdKind = (typeof ID_KINDS)[number];

/** Why the books could not be opened. The data layer returns these, and the page shows them. */
export const STORE_PROBLEMS = [
  'cannot-open',
  'bad-migration-file-name',
  'duplicate-migration-version',
  'applied-migration-changed',
  'applied-migration-missing',
  'migration-failed',
  'pre-migration-copy-failed',
  'integrity-failed',
] as const;
export type StoreProblem = (typeof STORE_PROBLEMS)[number];

/**
 * Ends every switch over a literal union. If a new member is added and a case is missing,
 * this stops compiling. Reaching it at run time is a bug, so it throws.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
