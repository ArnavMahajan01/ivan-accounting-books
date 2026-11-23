import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { countAudit, listAudit } from '@data/audit-repository';
import { countJournalEntries, countJournalLines, getJournalEntry } from '@data/journal-queries';
import type { EntryInput, EntryLineInput, JournalEntry } from '@domain/journal';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { changeEntry, postEntry, removeEntry } from './post-journal';
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

function day(text: string) {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('bad date');
  return parsed.value;
}

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

const entry = (over: Partial<EntryInput> = {}): EntryInput => ({
  date: day('2026-11-23'),
  memo: 'Timber',
  sourceKind: 'manual',
  sourceId: null,
  lines: [line('5000', 5000), line('1000', -5000)],
  ...over,
});

function posted(over: Partial<EntryInput> = {}): JournalEntry {
  const result = postEntry(ctx, entry(over));
  if (!result.ok) throw new Error('not posted');
  return result.value;
}

const lock = (date: string) => ctx.db.prepare('UPDATE business SET lock_date = ?').run(date);
const counts = () => [countJournalEntries(ctx.db), countJournalLines(ctx.db), countAudit(ctx.db)];
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

describe('changeEntry', () => {
  it('changes the date, memo and lines, keeping the id, with one audit row of before and after', () => {
    const original = posted();
    const auditBefore = countAudit(ctx.db);
    const result = changeEntry(
      ctx,
      original.id,
      entry({
        date: day('2026-11-24'),
        memo: 'Timber and screws',
        lines: [line('5000', 6500), line('1000', -6500)],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(original.id);
    expect(result.value).toMatchObject({
      date: '2026-11-24',
      memo: 'Timber and screws',
      createdAt: original.createdAt,
    });
    expect(getJournalEntry(ctx.db, original.id)).toEqual(result.value);
    expect(countJournalLines(ctx.db)).toBe(2);
    expect(countAudit(ctx.db)).toBe(auditBefore + 1);

    const history = listAudit(ctx.db, { table: 'journal_entry', rowId: original.id });
    expect(history.map((h) => h.kind)).toEqual(['entry.post', 'entry.change']);
    expect(history[1]?.before).toEqual(asJson(original));
    expect(history[1]?.after).toEqual(asJson(result.value));
  });

  it('refuses a change that does not balance, and leaves the entry as it was', () => {
    const original = posted();
    const before = counts();
    const result = changeEntry(
      ctx,
      original.id,
      entry({ lines: [line('5000', 5000), line('1000', -4000)] }),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-entry' } });
    expect(counts()).toEqual(before);
    expect(getJournalEntry(ctx.db, original.id)).toEqual(original);
  });

  it('refuses to change an entry on or before the lock date', () => {
    const original = posted({ date: day('2026-06-30') });
    lock('2026-06-30');
    const before = counts();
    expect(changeEntry(ctx, original.id, entry({ date: day('2026-08-01') }))).toEqual({
      ok: false,
      error: { code: 'entry-locked', lockDate: '2026-06-30' },
    });
    expect(counts()).toEqual(before);
    expect(getJournalEntry(ctx.db, original.id)).toEqual(original);
  });

  it('refuses to move an open entry into a locked period', () => {
    const original = posted({ date: day('2026-08-01') });
    lock('2026-06-30');
    expect(changeEntry(ctx, original.id, entry({ date: day('2026-06-30') }))).toMatchObject({
      ok: false,
      error: { code: 'invalid-entry', problems: [{ code: 'locked-period' }] },
    });
    expect(getJournalEntry(ctx.db, original.id)).toEqual(original);
  });

  it('refuses an entry that does not exist', () => {
    expect(changeEntry(ctx, 'ent_nope', entry())).toEqual({
      ok: false,
      error: { code: 'entry-not-found' },
    });
  });

  it('rolls the whole change back if its audit row cannot be written', () => {
    const original = posted();
    const before = counts();
    ctx.db
      .prepare(
        "CREATE TRIGGER no_audit BEFORE INSERT ON audit_log WHEN NEW.kind = 'entry.change' BEGIN SELECT RAISE(ABORT, 'no audit'); END",
      )
      .run();
    expect(() =>
      changeEntry(
        ctx,
        original.id,
        entry({ memo: 'Changed', lines: [line('5000', 100), line('1000', -100)] }),
      ),
    ).toThrow('no audit');
    expect(counts()).toEqual(before);
    expect(getJournalEntry(ctx.db, original.id)).toEqual(original);
  });
});

describe('removeEntry', () => {
  it('removes the entry and its lines, with one audit row holding all of it', () => {
    const original = posted();
    const other = posted({ memo: 'Another' });
    const auditBefore = countAudit(ctx.db);
    expect(removeEntry(ctx, original.id)).toEqual({ ok: true, value: undefined });
    expect(getJournalEntry(ctx.db, original.id)).toBeNull();
    expect(getJournalEntry(ctx.db, other.id)).toEqual(other);
    expect(countJournalLines(ctx.db)).toBe(2);
    expect(countAudit(ctx.db)).toBe(auditBefore + 1);
    const removal = listAudit(ctx.db, { table: 'journal_entry', rowId: original.id }).at(-1);
    expect(removal).toMatchObject({ kind: 'entry.remove', after: null });
    expect(removal?.before).toEqual(asJson(original));
  });

  it('refuses an entry on or before the lock date, and one that does not exist', () => {
    const original = posted({ date: day('2026-06-30') });
    lock('2026-06-30');
    const before = counts();
    expect(removeEntry(ctx, original.id)).toEqual({
      ok: false,
      error: { code: 'entry-locked', lockDate: '2026-06-30' },
    });
    expect(removeEntry(ctx, 'ent_nope')).toEqual({ ok: false, error: { code: 'entry-not-found' } });
    expect(counts()).toEqual(before);
  });

  it('rolls the removal back if its audit row cannot be written', () => {
    const original = posted();
    const before = counts();
    ctx.db
      .prepare(
        "CREATE TRIGGER no_audit BEFORE INSERT ON audit_log WHEN NEW.kind = 'entry.remove' BEGIN SELECT RAISE(ABORT, 'no audit'); END",
      )
      .run();
    expect(() => removeEntry(ctx, original.id)).toThrow('no audit');
    expect(counts()).toEqual(before);
    expect(getJournalEntry(ctx.db, original.id)).toEqual(original);
  });
});
