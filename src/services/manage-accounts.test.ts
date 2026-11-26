import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode, getAccountById, listAccounts } from '@data/account-repository';
import { countAudit, listAudit } from '@data/audit-repository';
import {
  addAccount,
  changeAccountCode,
  deactivateAccount,
  reactivateAccount,
  renameAccount,
} from './manage-accounts';
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

function cheque() {
  const account = getAccountByCode(ctx.db, '1000');
  if (account === null) throw new Error('missing account');
  return account;
}

describe('setup writes an audit row', () => {
  it('records the business setup once', () => {
    expect(listAudit(ctx.db).map((r) => [r.kind, r.table])).toEqual([
      ['business.setup', 'business'],
    ]);
  });
});

describe('addAccount', () => {
  it('adds an account, with one audit row holding it', () => {
    const before = countAudit(ctx.db);
    const result = addAccount(ctx, { code: '1020', name: 'Term deposit', type: 'asset' });
    expect(result).toMatchObject({
      ok: true,
      value: { code: '1020', name: 'Term deposit', active: true },
    });
    expect(countAudit(ctx.db)).toBe(before + 1);
    const id = result.ok ? result.value.id : '';
    expect(listAudit(ctx.db, { table: 'account', rowId: id })).toMatchObject([
      { kind: 'account.add', before: null, after: { code: '1020', name: 'Term deposit' } },
    ]);
  });

  it('adds a sub-account under a bank account', () => {
    const sub = addAccount(ctx, {
      code: '1001',
      name: 'Wages account',
      type: 'asset',
      parentId: cheque().id,
    });
    expect(sub).toMatchObject({ ok: true, value: { parentId: cheque().id } });
  });

  it('refuses a code in use, a missing parent, and blanks, and saves nothing', () => {
    const accounts = listAccounts(ctx.db);
    const audit = countAudit(ctx.db);
    expect(addAccount(ctx, { code: '1000', name: 'Duplicate', type: 'asset' })).toEqual({
      ok: false,
      error: 'code-in-use',
    });
    expect(
      addAccount(ctx, { code: '1021', name: 'X', type: 'asset', parentId: 'acc_missing' }),
    ).toEqual({
      ok: false,
      error: 'parent-not-found',
    });
    expect(addAccount(ctx, { code: ' ', name: 'X', type: 'asset' })).toEqual({
      ok: false,
      error: 'empty-code',
    });
    expect(addAccount(ctx, { code: '1022', name: ' ', type: 'asset' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(listAccounts(ctx.db)).toEqual(accounts);
    expect(countAudit(ctx.db)).toBe(audit);
  });
});

describe('renameAccount and changeAccountCode', () => {
  it('renames, with the audit row holding the name before and after', () => {
    const result = renameAccount(ctx, cheque().id, 'Everyday business account');
    expect(result).toMatchObject({
      ok: true,
      value: { name: 'Everyday business account', code: '1000' },
    });
    expect(listAudit(ctx.db, { table: 'account', rowId: cheque().id })).toMatchObject([
      {
        kind: 'account.rename',
        before: { name: 'Business cheque account' },
        after: { name: 'Everyday business account' },
      },
    ]);
  });

  it('changes a code to a free one, and refuses one in use', () => {
    const { id } = cheque();
    expect(changeAccountCode(ctx, id, '1005')).toMatchObject({ ok: true, value: { code: '1005' } });
    expect(getAccountByCode(ctx.db, '1000')).toBeNull();
    expect(changeAccountCode(ctx, id, '1010')).toEqual({ ok: false, error: 'code-in-use' });
    expect(getAccountById(ctx.db, id)?.code).toBe('1005');
  });

  it('refuses a change that changes nothing, a blank, and an account that does not exist', () => {
    const audit = countAudit(ctx.db);
    expect(renameAccount(ctx, cheque().id, 'Business cheque account')).toEqual({
      ok: false,
      error: 'unchanged',
    });
    expect(changeAccountCode(ctx, cheque().id, '1000')).toEqual({ ok: false, error: 'unchanged' });
    expect(renameAccount(ctx, cheque().id, '  ')).toEqual({ ok: false, error: 'empty-name' });
    expect(changeAccountCode(ctx, cheque().id, '')).toEqual({ ok: false, error: 'empty-code' });
    expect(renameAccount(ctx, 'acc_missing', 'X')).toEqual({ ok: false, error: 'not-found' });
    expect(countAudit(ctx.db)).toBe(audit);
  });
});

describe('deactivateAccount and reactivateAccount', () => {
  it('deactivates and reactivates, keeping the account', () => {
    expect(deactivateAccount(ctx, cheque().id)).toMatchObject({
      ok: true,
      value: { active: false },
    });
    expect(getAccountById(ctx.db, cheque().id)?.active).toBe(false);
    expect(deactivateAccount(ctx, cheque().id)).toEqual({ ok: false, error: 'already-inactive' });
    expect(reactivateAccount(ctx, cheque().id)).toMatchObject({
      ok: true,
      value: { active: true },
    });
    expect(reactivateAccount(ctx, cheque().id)).toEqual({ ok: false, error: 'already-active' });
    expect(listAudit(ctx.db, { table: 'account', rowId: cheque().id }).map((r) => r.kind)).toEqual([
      'account.deactivate',
      'account.reactivate',
    ]);
  });

  it('keeps every account: no deleting or merging exists', async () => {
    const services = await import('./manage-accounts');
    expect(Object.keys(services).sort()).toEqual([
      'addAccount',
      'changeAccountCode',
      'deactivateAccount',
      'editAccount',
      'reactivateAccount',
      'renameAccount',
    ]);
  });
});

describe('a change and its audit row are saved together', () => {
  it('rolls the change back if the audit row cannot be written', () => {
    // An audit row with a repeated id is refused, which stands in for any failure after the change.
    ctx.db
      .prepare(
        "CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'forced'); END",
      )
      .run();
    expect(() => renameAccount(ctx, cheque().id, 'Changed')).toThrow('forced');
    expect(cheque().name).toBe('Business cheque account');
  });
});
