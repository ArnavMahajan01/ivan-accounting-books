import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { countAudit, listAudit } from '@data/audit-repository';
import { countJournalEntries, countJournalLines, getJournalEntry } from '@data/journal-queries';
import type { EntryInput, EntryLineInput } from '@domain/journal';
import { seededRandom, type RandomSource } from '@shared/ids';
import { asCents } from '@shared/money';
import { parseCalendarDate } from '@shared/dates';
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

function account(code: string) {
  const found = getAccountByCode(ctx.db, code);
  if (found === null) throw new Error(`no account ${code}`);
  return found;
}

function day(text: string) {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
}

function line(code: string, amount: number, gst = 0, tax: 'GST' | null = null): EntryLineInput {
  const taxCode =
    tax === null ? null : ctx.db.prepare('SELECT id FROM tax_code WHERE short_code = ?').get(tax);
  return {
    accountId: account(code).id,
    amount: asCents(amount),
    taxCodeId: taxCode === null ? null : ((taxCode as { id: string }).id as `tax_${string}`),
    gst: asCents(gst),
    payeeId: null,
    memo: '',
  };
}

// A sale of $1,100 including GST, paid into the bank.
function sale(over: Partial<EntryInput> = {}): EntryInput {
  return {
    date: day('2026-11-23'),
    memo: 'A sale',
    sourceKind: 'manual',
    sourceId: null,
    lines: [line('1000', 110000), line('4000', -100000, -10000, 'GST'), line('2200', -10000)],
    ...over,
  };
}

const counts = () => [countJournalEntries(ctx.db), countJournalLines(ctx.db), countAudit(ctx.db)];

describe('postEntry', () => {
  it('posts a balanced entry with exactly one audit row', () => {
    const [, , auditBefore] = counts();
    const result = postEntry(ctx, sale());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(counts()).toEqual([1, 3, (auditBefore ?? 0) + 1]);
    expect(getJournalEntry(ctx.db, result.value.id)).toEqual(result.value);
    const audit = listAudit(ctx.db, { table: 'journal_entry', rowId: result.value.id });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ kind: 'entry.post', before: null });
    expect(audit[0]?.after).toEqual(JSON.parse(JSON.stringify(result.value)));
  });

  it('keeps the lines in the order they were given, with their GST', () => {
    const result = postEntry(ctx, sale());
    if (!result.ok) throw new Error('not posted');
    expect(result.value.lines.map((l) => [l.amount, l.gst])).toEqual([
      [110000, 0],
      [-100000, -10000],
      [-10000, 0],
    ]);
  });

  it('refuses an entry that does not balance, and saves nothing', () => {
    const before = counts();
    const result = postEntry(ctx, sale({ lines: [line('1000', 110000), line('4000', -100000)] }));
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'invalid-entry',
        problems: [{ code: 'lines-do-not-balance', difference: 10000 }],
      },
    });
    expect(counts()).toEqual(before);
  });

  it('refuses an entry on or before the lock date, but not the day after', () => {
    ctx.db.prepare("UPDATE business SET lock_date = '2026-06-30'").run();
    const before = counts();
    expect(postEntry(ctx, sale({ date: day('2026-06-30') }))).toMatchObject({
      ok: false,
      error: { problems: [{ code: 'locked-period', lockDate: '2026-06-30' }] },
    });
    expect(counts()).toEqual(before);
    expect(postEntry(ctx, sale({ date: day('2026-07-01') })).ok).toBe(true);
  });

  it('refuses an inactive account, and an unknown one', () => {
    ctx.db.prepare("UPDATE account SET active = 0 WHERE code = '4000'").run();
    expect(postEntry(ctx, sale())).toMatchObject({
      ok: false,
      error: { problems: [{ code: 'inactive-account', line: 1 }] },
    });
    const ghost = { ...line('1000', 5), accountId: 'acc_ghost' as const };
    expect(postEntry(ctx, sale({ lines: [ghost, line('2200', -5)] }))).toMatchObject({
      ok: false,
      error: { problems: [{ code: 'unknown-account', line: 0 }] },
    });
  });

  it('refuses to post before the business is set up', () => {
    const bare = createTestContext();
    expect(postEntry(bare, sale())).toEqual({ ok: false, error: { code: 'business-not-set-up' } });
    bare.close();
  });

  it('can post many entries, and every one balances', () => {
    for (let n = 1; n <= 25; n += 1) {
      const amount = n * 137;
      const entry = sale({
        lines: [line('1010', amount), line('4100', -amount)],
        date: day('2026-08-15'),
      });
      expect(postEntry(ctx, entry).ok).toBe(true);
    }
    const unbalanced = ctx.db
      .prepare('SELECT entry_id FROM journal_line GROUP BY entry_id HAVING SUM(amount_cents) <> 0')
      .all();
    expect(unbalanced).toEqual([]);
  });
});

describe('a failure halfway leaves nothing behind', () => {
  // The random source is asked for the entry's id first, then one id per line, then the audit
  // row's. Making it fail on the Nth ask fails the post at a different point each time.
  function failingOn(nth: number): RandomSource {
    const real = seededRandom(7);
    let asked = 0;
    return {
      bytes(count) {
        asked += 1;
        if (asked === nth) throw new Error('forced failure');
        return real.bytes(count);
      },
    };
  }

  it.each([
    [1, 'before anything is written'],
    [2, 'after the entry, before its first line'],
    [3, 'after the first line'],
    [4, 'after the second line, before the third'],
    [5, 'after every line, before the audit row'],
  ])('fails on id request %i (%s)', (nth) => {
    const before = counts();
    const failing = { ...ctx, random: failingOn(nth) };
    expect(() => postEntry(failing, sale())).toThrow('forced failure');
    expect(counts()).toEqual(before);
  });

  it('leaves nothing behind if the database refuses the second line', () => {
    const before = counts();
    ctx.db
      .prepare(
        "CREATE TRIGGER no_second_line BEFORE INSERT ON journal_line WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT, 'no second line'); END",
      )
      .run();
    expect(() => postEntry(ctx, sale())).toThrow('no second line');
    expect(counts()).toEqual(before);
  });

  it('leaves nothing behind if the audit row itself is refused by the database', () => {
    const before = counts();
    ctx.db
      .prepare(
        "CREATE TRIGGER no_audit BEFORE INSERT ON audit_log WHEN NEW.kind = 'entry.post' BEGIN SELECT RAISE(ABORT, 'no audit'); END",
      )
      .run();
    expect(() => postEntry(ctx, sale())).toThrow('no audit');
    expect(counts()).toEqual(before);
  });
});
