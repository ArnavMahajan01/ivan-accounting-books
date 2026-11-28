// Settings, Business (spec 132; wireframe/2111-settings, Option 3): the business name, ABN (checked
// with the ATO's check digits), GST basis and BAS frequency. The financial year is fixed at 1 July
// to 30 June and is not a setting. Changing the basis or the frequency changes how open periods'
// reports and BAS are worked out, so the screen warns first; locked periods never change.

import { getBusiness, updateBusiness } from '@data/business-repository';
import type { Business } from '@domain/business';
import { parseAbn } from '@domain/abn';
import type { BasFrequency, GstBasis } from '@shared/kinds';
import type { BusinessView } from '@shared/settings';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';

export interface BusinessSettingsInput {
  readonly name: string;
  /** As typed: spaces are allowed. */
  readonly abn: string;
  readonly gstBasis: GstBasis;
  readonly basFrequency: BasFrequency;
}

export type BusinessSettingsRefusal = 'not-set-up' | 'empty-name' | 'bad-abn' | 'unchanged';

export function changeBusinessSettings(
  ctx: ServiceContext,
  input: BusinessSettingsInput,
): Result<Business, BusinessSettingsRefusal> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return err('empty-name');
  const abn = parseAbn(input.abn);
  if (!abn.ok) return err('bad-abn');
  return ctx.db.transaction((): Result<Business, BusinessSettingsRefusal> => {
    const before = getBusiness(ctx.db);
    if (before === null) return err('not-set-up');
    if (
      before.name === name &&
      before.abn === abn.value &&
      before.gstBasis === input.gstBasis &&
      before.basFrequency === input.basFrequency
    ) {
      return err('unchanged');
    }
    const after: Business = {
      ...before,
      name,
      abn: abn.value,
      gstBasis: input.gstBasis,
      basFrequency: input.basFrequency,
      updatedAt: ctx.clock.now(),
    };
    updateBusiness(ctx.db, after);
    recordAudit(ctx, { kind: 'business.change', table: 'business', rowId: '1', before, after });
    return ok(after);
  })();
}

export function toBusinessView(b: Business): BusinessView {
  return {
    name: b.name,
    abn: b.abn,
    gstBasis: b.gstBasis,
    basFrequency: b.basFrequency,
    lockDate: b.lockDate,
  };
}

/** The business card, or null before setup. */
export function businessView(ctx: ReadContext): BusinessView | null {
  const b = getBusiness(ctx.db);
  return b === null ? null : toBusinessView(b);
}
