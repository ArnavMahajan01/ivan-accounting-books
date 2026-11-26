// Sets up a new set of books: the business's settings and the default chart of accounts, in one
// transaction. It refuses to run twice, so a second call can never overwrite the first.

import type { Business } from '@domain/business';
import { parseAbn } from '@domain/abn';
import { CHART_TEMPLATE } from '@domain/chart-template';
import type { Account } from '@domain/accounts';
import { insertAccount } from '@data/account-repository';
import { setAccountRole } from '@data/account-role-repository';
import { getBusiness, insertBusiness } from '@data/business-repository';
import { getTaxCodeByShortCode } from '@data/tax-code-repository';
import { newId, type Id } from '@shared/ids';
import type { BasFrequency, GstBasis } from '@shared/kinds';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface SetupBusinessInput {
  readonly name: string;
  /** As typed: spaces are allowed. */
  readonly abn: string;
  readonly gstRegistered: boolean;
  readonly gstBasis: GstBasis;
  readonly basFrequency: BasFrequency;
}

export type SetupBusinessError = 'already-set-up' | 'empty-name' | 'bad-abn';

export function setupBusiness(
  ctx: ServiceContext,
  input: SetupBusinessInput,
): Result<Business, SetupBusinessError> {
  const name = input.name.trim();
  if (name === '') return err('empty-name');
  const abn = parseAbn(input.abn);
  if (!abn.ok) return err('bad-abn');

  return ctx.db.transaction((): Result<Business, SetupBusinessError> => {
    if (getBusiness(ctx.db) !== null) return err('already-set-up');
    const now = ctx.clock.now();
    const business: Business = {
      name,
      abn: abn.value,
      gstRegistered: input.gstRegistered,
      gstBasis: input.gstBasis,
      basFrequency: input.basFrequency,
      lockDate: null,
      createdAt: now,
      updatedAt: now,
    };
    insertBusiness(ctx.db, business);
    const idsByCode = new Map<string, Id<'acc'>>();
    const taxCodeId = (shortCode: string): Id<'tax'> => {
      const taxCode = getTaxCodeByShortCode(ctx.db, shortCode);
      // The migration seeds all four, so a missing one means the books are not what the app expects.
      if (taxCode === null) throw new Error(`The books have no tax code ${shortCode}`);
      return taxCode.id;
    };
    for (const template of CHART_TEMPLATE) {
      const account: Account = {
        id: newId('acc', ctx.random),
        code: template.code,
        name: template.name,
        type: template.type,
        // The chart lists a parent before its sub-accounts, so the parent's id is known.
        parentId:
          template.parentCode === undefined ? null : (idsByCode.get(template.parentCode) ?? null),
        defaultTaxCodeId: taxCodeId(template.defaultTax),
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      insertAccount(ctx.db, account);
      idsByCode.set(template.code, account.id);
      if (template.role !== undefined) setAccountRole(ctx.db, template.role, account.id);
    }
    recordAudit(ctx, {
      kind: 'business.setup',
      table: 'business',
      rowId: '1',
      before: null,
      after: { business, accounts: CHART_TEMPLATE.length },
    });
    return ok(business);
  })();
}
