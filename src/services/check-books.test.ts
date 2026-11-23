import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import type { EntryLineInput } from '@domain/journal';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { checkBooks, NOT_OPEN } from './check-books';
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

function line(code: string, amount: number): EntryLineInput {
  const account = getAccountByCode(ctx.db, code);
  if (account === null) throw new Error(`no account ${code}`);
  return {
    accountId: account.id,
    amount: asCents(amount),
    taxCodeId: null,
    gst: asCents(0),
    payeeId: null,
    memo: '',
  };
}

function postTwo(): void {
  const date = parseCalendarDate('2026-08-01', 'YYYY-MM-DD');
  if (!date.ok) throw new Error('bad date');
  for (const amount of [5000, 7000]) {
    const result = postEntry(ctx, {
      date: date.value,
      memo: '',
      sourceKind: 'manual',
      sourceId: null,
      lines: [line('1000', amount), line('4000', -amount)],
    });
    if (!result.ok) throw new Error('not posted');
  }
}

describe('checkBooks', () => {
  it('finds nothing wrong in new books, or in books posted through the service', () => {
    expect(checkBooks(ctx)).toEqual({ problems: [], entries: 0, lines: 0 });
    postTwo();
    expect(checkBooks(ctx)).toEqual({ problems: [], entries: 2, lines: 4 });
  });

  it('reports a line that was changed straight in the database', () => {
    postTwo();
    ctx.db.prepare('UPDATE journal_line SET amount_cents = amount_cents + 1 WHERE rowid = 1').run();
    expect(checkBooks(ctx).problems).toEqual(['out-of-balance']);
  });

  it('reports a line that was deleted straight in the database', () => {
    postTwo();
    ctx.db.prepare('DELETE FROM journal_line WHERE rowid = 1').run();
    expect(checkBooks(ctx).problems).toEqual(['out-of-balance']);
  });

  it('reports two broken entries that cancel out in the trial balance', () => {
    postTwo();
    ctx.db.prepare('UPDATE journal_line SET amount_cents = amount_cents + 1 WHERE rowid = 1').run();
    ctx.db.prepare('UPDATE journal_line SET amount_cents = amount_cents - 1 WHERE rowid = 3').run();
    expect(checkBooks(ctx).problems).toEqual(['out-of-balance']);
  });

  it('reports a row that breaks the rules of its table, through the integrity check', () => {
    postTwo();
    ctx.db.pragma('ignore_check_constraints = ON');
    ctx.db.prepare('UPDATE journal_line SET amount_cents = 0 WHERE rowid = 1').run();
    ctx.db.pragma('ignore_check_constraints = OFF');
    expect(checkBooks(ctx).problems).toEqual(['integrity-failed', 'out-of-balance']);
  });

  it('reports data it cannot read, instead of throwing', () => {
    postTwo();
    ctx.db.pragma('ignore_check_constraints = ON');
    ctx.db.exec('DROP TABLE journal_line');
    ctx.db.pragma('ignore_check_constraints = OFF');
    expect(checkBooks(ctx).problems).toEqual(['integrity-failed']);
  });

  it('never changes the books', () => {
    postTwo();
    const dump = () =>
      JSON.stringify(ctx.db.prepare('SELECT * FROM journal_line ORDER BY rowid').all());
    const before = dump();
    checkBooks(ctx);
    expect(dump()).toBe(before);
  });

  it('has a health for books that did not open', () => {
    expect(NOT_OPEN).toEqual({ problems: ['not-open'], entries: 0, lines: 0 });
  });
});
