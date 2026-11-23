import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode, insertAccount, listAccounts } from '@data/account-repository';
import { getBusiness } from '@data/business-repository';
import { getTaxCodeByShortCode } from '@data/tax-code-repository';
import { CHART_TEMPLATE } from '@domain/chart-template';
import { newId } from '@shared/ids';
import { createTestContext } from './test-context';
import { setupBusiness, type SetupBusinessInput } from './setup-business';

// Invented business. The ABN passes the check digits but is made up.
const input: SetupBusinessInput = {
  name: 'Harbour Lane Joinery Pty Ltd',
  abn: '35 482 916 037',
  gstRegistered: true,
  gstBasis: 'cash',
  basFrequency: 'quarterly',
};

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
});
afterEach(() => {
  ctx.close();
});

describe('setupBusiness', () => {
  it('creates the business once, storing the ABN as 11 digits', () => {
    const result = setupBusiness(ctx, input);
    expect(result).toMatchObject({
      ok: true,
      value: {
        name: 'Harbour Lane Joinery Pty Ltd',
        abn: '35482916037',
        gstRegistered: true,
        gstBasis: 'cash',
        basFrequency: 'quarterly',
        lockDate: null,
      },
    });
    expect(getBusiness(ctx.db)).toEqual(result.ok ? result.value : null);
  });

  it('returns an error the second time and changes nothing', () => {
    setupBusiness(ctx, input);
    const before = getBusiness(ctx.db);
    const again = setupBusiness(ctx, {
      ...input,
      name: 'Someone Else Pty Ltd',
      gstBasis: 'accrual',
    });
    expect(again).toEqual({ ok: false, error: 'already-set-up' });
    expect(getBusiness(ctx.db)).toEqual(before);
  });

  it('refuses a bad ABN and an empty name, and saves nothing', () => {
    expect(setupBusiness(ctx, { ...input, abn: '51824753557' })).toEqual({
      ok: false,
      error: 'bad-abn',
    });
    expect(setupBusiness(ctx, { ...input, abn: '1234' })).toEqual({ ok: false, error: 'bad-abn' });
    expect(setupBusiness(ctx, { ...input, name: '   ' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(getBusiness(ctx.db)).toBeNull();
  });

  it('is refused by the database itself if anything but id 1 or a bad value is written', () => {
    const insert = (id: number, abn: string, basis: string) =>
      ctx.db
        .prepare(
          "INSERT INTO business (id, name, abn, gst_registered, gst_basis, bas_frequency, lock_date, created_at, updated_at) VALUES (?, 'x', ?, 1, ?, 'quarterly', NULL, 't', 't')",
        )
        .run(id, abn, basis);
    expect(() => insert(2, '35482916037', 'cash')).toThrow();
    expect(() => insert(1, '5182475355', 'cash')).toThrow();
    expect(() => insert(1, '35482916037', 'weekly')).toThrow();
  });
});

describe('setupBusiness and the chart', () => {
  it('creates the default chart in the same transaction', () => {
    setupBusiness(ctx, input);
    const accounts = listAccounts(ctx.db);
    expect(accounts).toHaveLength(CHART_TEMPLATE.length);
    expect(accounts.every((a) => a.active)).toBe(true);
    expect(getAccountByCode(ctx.db, '1000')).toMatchObject({
      name: 'Business cheque account',
      type: 'asset',
      parentId: null,
    });
  });

  it('sets each account to its default GST code', () => {
    setupBusiness(ctx, input);
    const gst = getTaxCodeByShortCode(ctx.db, 'GST');
    const outside = getTaxCodeByShortCode(ctx.db, 'N-T');
    expect(getAccountByCode(ctx.db, '4000')?.defaultTaxCodeId).toBe(gst?.id);
    expect(getAccountByCode(ctx.db, '1000')?.defaultTaxCodeId).toBe(outside?.id);
    expect(listAccounts(ctx.db).every((a) => a.defaultTaxCodeId !== null)).toBe(true);
  });

  it('creates no accounts when the setup is refused', () => {
    setupBusiness(ctx, input);
    const before = listAccounts(ctx.db);
    setupBusiness(ctx, input);
    expect(setupBusiness(ctx, { ...input, abn: '1' }).ok).toBe(false);
    expect(listAccounts(ctx.db)).toEqual(before);
  });

  it('refuses two accounts with the same code', () => {
    setupBusiness(ctx, input);
    const existing = getAccountByCode(ctx.db, '1000');
    if (existing === null) throw new Error('missing account');
    expect(() => {
      insertAccount(ctx.db, { ...existing, id: newId('acc', ctx.random), name: 'Another name' });
    }).toThrow(/UNIQUE/);
    expect(listAccounts(ctx.db)).toHaveLength(CHART_TEMPLATE.length);
  });

  it('rolls the business back if an account cannot be created', () => {
    const failing = {
      ...ctx,
      random: {
        bytes(count: number): Uint8Array {
          throw new Error('forced failure');
          return new Uint8Array(count);
        },
      },
    };
    expect(() => setupBusiness(failing, input)).toThrow('forced failure');
    expect(getBusiness(ctx.db)).toBeNull();
    expect(listAccounts(ctx.db)).toEqual([]);
  });
});
