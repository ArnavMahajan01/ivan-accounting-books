// Literal unions for every status and kind, so no code compares loose strings
// (context/code-standards.md). Later specs add their own kinds here.

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * Ends every switch over a literal union. If a new member is added and a case is missing,
 * this stops compiling. Reaching it at run time is a bug, so it throws.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
