import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { getBusiness } from '@data/business-repository';
import { parseCalendarDate } from '@shared/dates';
import { changeBusinessSettings } from './business-settings';
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

const valid = () => {
  const b = getBusiness(ctx.db);
  if (b === null) throw new Error('no business');
  return { name: b.name, abn: b.abn, gstBasis: b.gstBasis, basFrequency: b.basFrequency };
};

describe('changing the business settings (spec 132)', () => {
  it('saves a new name, ABN with spaces, basis and frequency, with an audit row', () => {
    const result = changeBusinessSettings(ctx, {
      ...valid(),
      name: '  Harbour Lane   Joinery ',
      abn: '51 824 753 556',
      gstBasis: 'accrual',
      basFrequency: 'monthly',
    });
    expect(result.ok).toBe(true);
    expect(getBusiness(ctx.db)).toMatchObject({
      name: 'Harbour Lane Joinery',
      abn: '51824753556',
      gstBasis: 'accrual',
      basFrequency: 'monthly',
    });
    expect(listAudit(ctx.db).filter((a) => a.kind === 'business.change')).toHaveLength(1);
  });

  it('refuses an empty name, a wrong ABN, or no change', () => {
    expect(changeBusinessSettings(ctx, { ...valid(), name: '  ' })).toEqual({
      ok: false,
      error: 'empty-name',
    });
    expect(changeBusinessSettings(ctx, { ...valid(), abn: '51 824 753 557' })).toEqual({
      ok: false,
      error: 'bad-abn',
    });
    expect(changeBusinessSettings(ctx, valid())).toEqual({ ok: false, error: 'unchanged' });
  });

  it('never moves the lock date', () => {
    const lockBefore = getBusiness(ctx.db)?.lockDate;
    changeBusinessSettings(ctx, { ...valid(), basFrequency: 'monthly' });
    expect(getBusiness(ctx.db)?.lockDate).toBe(lockBefore);
  });
});
