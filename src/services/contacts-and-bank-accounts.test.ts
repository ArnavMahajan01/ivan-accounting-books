import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { getAppMeta, setAppMeta, START_CHOICE_KEY } from '@data/app-meta-repository';
import { countAudit, listAudit } from '@data/audit-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { listContacts } from '@data/contact-repository';
import type { EntryLineInput } from '@domain/journal';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { addBankAccount } from './add-bank-account';
import { addContact } from './add-contact';
import { addAccount } from './manage-accounts';
import { deactivateBankAccount, renameBankAccount } from './manage-bank-accounts';
import { postEntry } from './post-journal';
import { setupBusiness } from './setup-business';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  setupBusiness(ctx, {
    name: 'Harbour Lane Joinery Pty Ltd',
    abn: '35482916037',
    gstRegistered: true,
    gstBasis: 'cash',
    basFrequency: 'quarterly',
  });
});
afterEach(() => {
  ctx.close();
});

describe('addContact', () => {
  it('adds a contact with one audit row', () => {
    const before = countAudit(ctx.db);
    const result = addContact(ctx, { name: ' Bunnings ', kind: 'supplier', createdFrom: 'manual' });
    expect(result).toMatchObject({
      ok: true,
      value: { name: 'Bunnings', kind: 'supplier', active: true },
    });
    expect(countAudit(ctx.db)).toBe(before + 1);
    expect(listAudit(ctx.db, { table: 'contact' })).toMatchObject([
      { kind: 'contact.add', before: null },
    ]);
    expect(listContacts(ctx.db)).toHaveLength(1);
  });

  it('refuses a blank name, and a name already used in any capitals', () => {
    addContact(ctx, { name: 'Timberlink', kind: 'supplier', createdFrom: 'manual' });
    const before = countAudit(ctx.db);
    expect(addContact(ctx, { name: '  ', kind: 'supplier', createdFrom: 'manual' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(addContact(ctx, { name: 'TIMBERLINK', kind: 'both', createdFrom: 'manual' })).toEqual({
      ok: false,
      error: 'name-in-use',
    });
    expect(listContacts(ctx.db)).toHaveLength(1);
    expect(countAudit(ctx.db)).toBe(before);
  });
});

describe('addBankAccount', () => {
  const cheque = () => {
    const found = getAccountByCode(ctx.db, '1000');
    if (found === null) throw new Error('no account');
    return found;
  };

  it('links a bank account to a ledger account, with one audit row, storing only four digits', () => {
    const result = addBankAccount(ctx, {
      name: 'Business One ··4821',
      bank: 'Westpac',
      lastFour: '4821',
      ledgerAccountId: cheque().id,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { lastFour: '4821', ledgerAccountId: cheque().id, active: true },
    });
    expect(listBankAccounts(ctx.db)).toHaveLength(1);
    expect(listAudit(ctx.db, { table: 'bank_account' })).toHaveLength(1);
  });

  it('refuses digits that are not exactly four, a missing or non-asset account, and one linked twice', () => {
    const input = { name: 'A', bank: 'Westpac', lastFour: '4821', ledgerAccountId: cheque().id };
    expect(addBankAccount(ctx, { ...input, lastFour: '48210' })).toEqual({
      ok: false,
      error: 'bad-last-four',
    });
    expect(addBankAccount(ctx, { ...input, lastFour: '48a1' })).toEqual({
      ok: false,
      error: 'bad-last-four',
    });
    expect(addBankAccount(ctx, { ...input, name: ' ' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(addBankAccount(ctx, { ...input, bank: '' })).toEqual({ ok: false, error: 'empty-bank' });
    expect(addBankAccount(ctx, { ...input, ledgerAccountId: 'acc_nope' })).toEqual({
      ok: false,
      error: 'account-not-found',
    });
    const sales = getAccountByCode(ctx.db, '4000');
    expect(addBankAccount(ctx, { ...input, ledgerAccountId: sales?.id ?? '' })).toEqual({
      ok: false,
      error: 'not-an-asset',
    });
    expect(addBankAccount(ctx, input).ok).toBe(true);
    expect(addBankAccount(ctx, input)).toEqual({ ok: false, error: 'already-linked' });
    expect(listBankAccounts(ctx.db)).toHaveLength(1);
  });
});

describe('managing bank accounts', () => {
  const ledgerAccount = (code: string) => {
    const found = getAccountByCode(ctx.db, code);
    if (found === null) throw new Error(code);
    return found;
  };
  const addOne = (name: string, lastFour: string, ledgerAccountId: string, parentId?: string) => {
    const result = addBankAccount(ctx, {
      name,
      bank: 'Westpac',
      lastFour,
      ledgerAccountId,
      ...(parentId === undefined ? {} : { parentId }),
    });
    if (!result.ok) throw new Error(result.error);
    return result.value;
  };

  it('renames an account with the old and new names in one audit row', () => {
    const account = addOne('Business One', '4821', ledgerAccount('1000').id);
    const before = countAudit(ctx.db);
    expect(renameBankAccount(ctx, account.id, '  Everyday  ')).toMatchObject({
      ok: true,
      value: { name: 'Everyday', lastFour: '4821' },
    });
    expect(countAudit(ctx.db)).toBe(before + 1);
    expect(listAudit(ctx.db, { table: 'bank_account' }).at(-1)).toMatchObject({
      kind: 'bank-account.rename',
      before: { name: 'Business One' },
      after: { name: 'Everyday' },
    });
  });

  it('refuses a blank name, the same name, and an account that does not exist, with no audit row', () => {
    const account = addOne('Business One', '4821', ledgerAccount('1000').id);
    const before = countAudit(ctx.db);
    expect(renameBankAccount(ctx, account.id, ' ')).toEqual({ ok: false, error: 'empty-name' });
    expect(renameBankAccount(ctx, account.id, 'Business One')).toEqual({
      ok: false,
      error: 'unchanged',
    });
    expect(renameBankAccount(ctx, 'bnk_ghost', 'X')).toEqual({ ok: false, error: 'not-found' });
    expect(countAudit(ctx.db)).toBe(before);
  });

  it('deactivates an account once, and keeps the row', () => {
    const account = addOne('Business One', '4821', ledgerAccount('1000').id);
    expect(deactivateBankAccount(ctx, account.id)).toMatchObject({
      ok: true,
      value: { active: false },
    });
    expect(deactivateBankAccount(ctx, account.id)).toEqual({
      ok: false,
      error: 'already-inactive',
    });
    expect(listBankAccounts(ctx.db)).toMatchObject([{ id: account.id, active: false }]);
    expect(listAudit(ctx.db, { table: 'bank_account' }).at(-1)).toMatchObject({
      kind: 'bank-account.deactivate',
    });
  });

  it('supports a sub-account under another account, one level deep', () => {
    const second = addAccount(ctx, { code: '1015', name: 'Savings', type: 'asset' });
    const third = addAccount(ctx, { code: '1016', name: 'Savings Two', type: 'asset' });
    if (!second.ok || !third.ok) throw new Error('no accounts');
    const main = addOne('Business One', '4821', ledgerAccount('1000').id);
    const sub = addOne('Tax Savings', '9911', second.value.id, main.id);
    expect(sub.parentId).toBe(main.id);
    expect(
      addBankAccount(ctx, {
        name: 'Deeper',
        bank: 'Westpac',
        lastFour: '1234',
        ledgerAccountId: third.value.id,
        parentId: sub.id,
      }),
    ).toEqual({ ok: false, error: 'parent-is-a-sub-account' });
    expect(
      addBankAccount(ctx, {
        name: 'Lost',
        bank: 'Westpac',
        lastFour: '1234',
        ledgerAccountId: third.value.id,
        parentId: 'bnk_ghost',
      }),
    ).toEqual({ ok: false, error: 'parent-not-found' });
  });

  it('will not deactivate an account that still has active sub-accounts', () => {
    const second = addAccount(ctx, { code: '1015', name: 'Savings', type: 'asset' });
    if (!second.ok) throw new Error('no account');
    const main = addOne('Business One', '4821', ledgerAccount('1000').id);
    const sub = addOne('Tax Savings', '9911', second.value.id, main.id);
    expect(deactivateBankAccount(ctx, main.id)).toEqual({
      ok: false,
      error: 'has-active-sub-accounts',
    });
    expect(deactivateBankAccount(ctx, sub.id).ok).toBe(true);
    expect(deactivateBankAccount(ctx, main.id).ok).toBe(true);
  });
});

describe('a payee on a posted line', () => {
  function line(code: string, amount: number, payeeId: string | null): EntryLineInput {
    const account = getAccountByCode(ctx.db, code);
    if (account === null) throw new Error(code);
    return {
      accountId: account.id,
      amount: asCents(amount),
      taxCodeId: null,
      gst: asCents(0),
      payeeId,
      memo: '',
    };
  }
  const post = (payeeId: string | null) => {
    const date = parseCalendarDate('2026-08-01', 'YYYY-MM-DD');
    if (!date.ok) throw new Error('date');
    return postEntry(ctx, {
      date: date.value,
      memo: '',
      sourceKind: 'bank-line',
      sourceId: null,
      lines: [line('5000', 100, payeeId), line('1000', -100, null)],
    });
  };

  it('is accepted when it is a contact, and refused when it is not', () => {
    const contact = addContact(ctx, {
      name: 'Timberlink',
      kind: 'supplier',
      createdFrom: 'manual',
    });
    if (!contact.ok) throw new Error('no contact');
    expect(post(contact.value.id).ok).toBe(true);
    expect(post('con_ghost')).toMatchObject({
      ok: false,
      error: { problems: [{ code: 'unknown-payee', line: 0 }] },
    });
    expect(post(null).ok).toBe(true);
  });
});

describe('app meta', () => {
  it('keeps small facts such as the first-launch choice, and replaces a value', () => {
    expect(getAppMeta(ctx.db, START_CHOICE_KEY)).toBeNull();
    setAppMeta(ctx.db, START_CHOICE_KEY, 'own');
    expect(getAppMeta(ctx.db, START_CHOICE_KEY)).toBe('own');
    setAppMeta(ctx.db, START_CHOICE_KEY, 'sample');
    expect(getAppMeta(ctx.db, START_CHOICE_KEY)).toBe('sample');
    expect(getAppMeta(ctx.db, 'schema_version')).not.toBeNull();
  });
});
