import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { invoiceFixture } from '../../tests/fixtures/invoices/fixtures';
import { listAudit } from '@data/audit-repository';
import { getContactById, getContactByName } from '@data/contact-repository';
import { currentInvoice } from '@data/invoice-repository';
import { entryIdsWithPayee } from '@data/journal-queries';
import { listContactMatches, saveContactMatch } from '@data/review-repository';
import { listRules } from '@data/rule-repository';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { addContactByHand } from './contacts';
import { getTrialBalance } from './get-trial-balance';
import { commitInvoiceFile } from './invoice-import';
import { contactPairs, keepBoth, mergeContacts } from './merge-contacts';
import { lockPeriod } from './quarter-close';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
const day = (t: string): CalendarDate => {
  const p = parseCalendarDate(t, 'YYYY-MM-DD');
  if (!p.ok) throw new Error(t);
  return p.value;
};
const idOf = (name: string) => {
  const c = getContactByName(ctx.db, name);
  if (c === null) throw new Error(`no contact ${name}`);
  return c.id as string;
};
const add = (name: string, kind: 'customer' | 'supplier' = 'supplier', abn = '') => {
  const made = addContactByHand(ctx, { name, kind, email: '', phone: '', abn, notes: '' });
  if (!made.ok) throw new Error(made.error);
  return made.value.id as string;
};
const balanced = () => {
  const tb = getTrialBalance(ctx, { from: null, to: null });
  return tb.ok && tb.value.balanced;
};

beforeEach(() => {
  ctx = createTestContext();
  buildSampleBooks({ db: ctx.db }, day('2026-11-23'));
});
afterEach(() => {
  ctx.close();
});

describe('offering duplicates (spec 124)', () => {
  it('the sample books have none, and a near copy is offered with why', () => {
    expect(contactPairs(ctx)).toEqual([]);
    const copy = add('Timberlink Supplies Pty Ltd');
    const pairs = contactPairs(ctx);
    expect(pairs.map((p) => p.reason)).toEqual(['similar-names']);
    expect([pairs[0]?.first.name, pairs[0]?.second.name].sort()).toEqual([
      'Timberlink',
      'Timberlink Supplies Pty Ltd',
    ]);
    expect([pairs[0]?.first.id, pairs[0]?.second.id]).toContain(copy);
  });

  it('the same bank words are a stronger reason than a similar name', () => {
    const other = add('Hardware Warehouse');
    saveContactMatch(ctx.db, 'BUNNINGS WAREHOUSE', other, ctx.clock.now());
    saveContactMatch(ctx.db, 'BUNNINGS', idOf('Bunnings'), ctx.clock.now());
    expect(contactPairs(ctx).map((p) => [p.first.name, p.second.name, p.reason])).toContainEqual([
      'Bunnings',
      'Hardware Warehouse',
      'same-bank-words',
    ]);
  });

  it('Keep both is never offered again', () => {
    const copy = add('Timberlink Supplies');
    expect(keepBoth(ctx, copy, idOf('Timberlink')).ok).toBe(true);
    expect(contactPairs(ctx)).toEqual([]);
  });
});

describe('merging (spec 124)', () => {
  it('moves every transaction, rule and saved word to the contact kept, and the books balance', () => {
    const timberlink = idOf('Timberlink');
    const entries = entryIdsWithPayee(ctx.db, timberlink);
    expect(entries.length).toBeGreaterThan(0);
    saveContactMatch(ctx.db, 'TIMBERLINK', timberlink, ctx.clock.now());
    const keep = add('Timberlink Supplies Pty Ltd');
    const changesBefore = listAudit(ctx.db).filter((a) => a.kind === 'entry.change').length;

    expect(mergeContacts(ctx, keep, timberlink)).toEqual({
      ok: true,
      value: { moved: entries.length },
    });
    expect(getContactById(ctx.db, timberlink)).toBeNull();
    expect(entryIdsWithPayee(ctx.db, keep)).toEqual(entries);
    expect(listRules(ctx.db).some((r) => r.payeeId === timberlink)).toBe(false);
    expect(listRules(ctx.db).some((r) => r.payeeId === keep)).toBe(true);
    expect(listContactMatches(ctx.db)).toContainEqual({ words: 'TIMBERLINK', contactId: keep });
    expect(balanced()).toBe(true);
    const audit = listAudit(ctx.db);
    expect(audit.filter((a) => a.kind === 'contact.merge')).toHaveLength(1);
    expect(audit.filter((a) => a.kind === 'entry.change')).toHaveLength(
      changesBefore + entries.length,
    );
  });

  it('moves invoices too, keeps details, and a customer and supplier become both', () => {
    commitInvoiceFile(ctx, invoiceFixture('admin-dashboard-invoices-2026-11-22'));
    const coastal = idOf('Coastal Body Corporate');
    const keep = add('Coastal Body Corp', 'supplier');
    expect(mergeContacts(ctx, keep, coastal).ok).toBe(true);
    expect(currentInvoice(ctx.db, 'INV-1064')?.contactId).toBe(keep);
    expect(getContactById(ctx.db, keep)?.kind).toBe('both');
    expect(contactPairs(ctx)).toEqual([]);
    expect(balanced()).toBe(true);
  });

  it('refuses to merge away a contact with transactions in a locked period, and changes nothing', () => {
    expect(lockPeriod(ctx, day('2026-09-30')).ok).toBe(true);
    const timberlink = idOf('Timberlink');
    const keep = add('Timberlink Supplies');
    const before = entryIdsWithPayee(ctx.db, timberlink);
    expect(mergeContacts(ctx, keep, timberlink)).toEqual({ ok: false, error: 'locked' });
    expect(entryIdsWithPayee(ctx.db, timberlink)).toEqual(before);
    // The other way round keeps the one with locked transactions, and works.
    expect(mergeContacts(ctx, timberlink, keep).ok).toBe(true);
  });

  it('refuses a contact merged with itself, or one that is gone', () => {
    const t = idOf('Timberlink');
    expect(mergeContacts(ctx, t, t)).toEqual({ ok: false, error: 'same-contact' });
    expect(mergeContacts(ctx, t, 'con_gone')).toEqual({ ok: false, error: 'not-found' });
  });
});
