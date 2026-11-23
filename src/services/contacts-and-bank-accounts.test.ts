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
