import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseCalendarDate } from '@shared/dates';
import { addBankAccount } from './add-bank-account';
import { bankAccountsSettings } from './bank-accounts-settings';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
});
afterEach(() => {
  ctx.close();
});

describe('Settings, Bank accounts (spec 133)', () => {
  it('lists his bank accounts with their bank, and the asset accounts free to link', () => {
    const view = bankAccountsSettings(ctx);
    expect(view.accounts.length).toBeGreaterThan(0);
    expect(view.accounts[0]?.active).toBe(true);
    expect(view.accounts[0]?.lastFour).toMatch(/^\d{4}$/);
    expect(view.freeLedgers.map((l) => l.code)).not.toContain('1090');
    expect(view.freeLedgers.map((l) => l.code)).not.toContain('1100');
    const free = view.freeLedgers[0];
    if (free === undefined) throw new Error('no free asset account');
    expect(
      addBankAccount(ctx, {
        name: 'Card',
        bank: 'CommBank',
        lastFour: '1234',
        ledgerAccountId: free.id,
      }).ok,
    ).toBe(true);
    const after = bankAccountsSettings(ctx);
    expect(after.accounts.some((a) => a.bank === 'CommBank')).toBe(true);
    expect(after.freeLedgers.some((l) => l.id === free.id)).toBe(false);
  });
});
