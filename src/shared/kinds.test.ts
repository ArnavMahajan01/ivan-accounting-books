import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPES, assertNever, isAccountType, type AccountType } from './kinds';

function normalSide(type: AccountType): 'debit' | 'credit' {
  switch (type) {
    case 'asset':
    case 'expense':
      return 'debit';
    case 'liability':
    case 'equity':
    case 'income':
      return 'credit';
    default:
      return assertNever(type);
  }
}

describe('AccountType', () => {
  it('lists the five account types', () => {
    expect(ACCOUNT_TYPES).toEqual(['asset', 'liability', 'equity', 'income', 'expense']);
  });

  it('recognises only those five', () => {
    expect(isAccountType('income')).toBe(true);
    expect(isAccountType('Income')).toBe(false);
    expect(isAccountType('revenue')).toBe(false);
    expect(isAccountType('')).toBe(false);
  });

  it('works in an exhaustive switch', () => {
    expect(ACCOUNT_TYPES.map(normalSide)).toEqual(['debit', 'credit', 'credit', 'credit', 'debit']);
  });
});

describe('assertNever', () => {
  it('throws if reached with a value the types did not expect', () => {
    expect(() => assertNever('surprise' as never)).toThrow('Unexpected value: surprise');
  });
});
