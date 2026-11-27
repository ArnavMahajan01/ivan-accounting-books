import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { getJournalEntry } from '@data/journal-queries';
import { getAccountById } from '@data/account-repository';
import { listChanges } from '@data/accountant-change-repository';
import { getSheetLink } from '@data/sheet-link-repository';
import {
  EDITABLE_TRANSACTION_COLUMNS,
  FIRST_TRANSACTION_ROW,
  REF_COLUMN,
} from '@domain/sheet-tabs';
import { parseCalendarDate } from '@shared/dates';
import type { PeriodChoice } from '@shared/reports';
import { acceptChange, changesView, rejectChange } from '@services/accountant-changes';
import { lockPeriod } from '@services/quarter-close';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { createTestContext } from '@services/test-context';
import { createFakeGoogle, type FakeGoogle } from './fake-google';
import { publishWorkbook } from './publish';
import { checkSheets } from './read-back';

let ctx: ReturnType<typeof createTestContext>;
let google: FakeGoogle;
let fileId: string;
let linkId: string;
let minute = 0;

async function publish(choice: PeriodChoice) {
  const out = await publishWorkbook(
    { ctx, api: google.api, connected: true },
    { kind: 'transactions', period: { choice, from: null, to: null } },
    { asNew: false },
  );
  if (out.kind !== 'published') throw new Error('not published');
  linkId = out.linkId;
  fileId = getSheetLink(ctx.db, linkId)?.fileId ?? '';
}

beforeEach(async () => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
  // Every write to the fake Drive is a new "modified" time, as in Drive.
  google = createFakeGoogle({
    path: null,
    now: () => `2026-11-23T02:${String((minute += 1) % 60).padStart(2, '0')}:00.000Z`,
  });
  await google.connection.connect();
  await publish('this-quarter');
});
afterEach(() => {
  ctx.close();
});

const row = (i: number) => FIRST_TRANSACTION_ROW + i;
const refAt = (i: number) => google.cell(fileId, 'transactions', REF_COLUMN, row(i)) ?? '';
const edit = (i: number, column: number, text: string) =>
  google.pretendEdit(fileId, 'transactions', column, row(i), text, 'accountant@example.com');
const accountOf = (entryId: string) => {
  const entry = getJournalEntry(ctx.db, entryId);
  const other = entry?.lines.find((l) => l.taxCodeId !== null);
  return other === undefined ? null : getAccountById(ctx.db, other.accountId)?.name;
};

describe('reading back the accountant’s changes (spec 116)', () => {
  it('keeps an edit as a proposal, and changes nothing in the books', async () => {
    const entryId = refAt(0);
    const before = getJournalEntry(ctx.db, entryId);
    expect(accountOf(entryId)).toBe('Rent');
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Insurance');
    expect(await checkSheets(ctx, google.api)).toEqual({ read: 1, added: 1, stopped: null });
    expect(getJournalEntry(ctx.db, entryId)).toEqual(before);
    const view = changesView(ctx);
    expect(view.waiting).toEqual([
      expect.objectContaining({
        field: 'account',
        was: 'Rent',
        now: 'Insurance',
        by: 'accountant@example.com',
        sheetRow: row(0) + 1,
        blocked: null,
      }),
    ]);
    // What accepting does, worked out, not applied: Rent down and Insurance up by the same.
    const effect = view.waiting[0]?.effect ?? [];
    expect(effect.map((e) => e.account)).toEqual(['Rent', 'Insurance']);
    expect((effect[0]?.cents ?? 0) + (effect[1]?.cents ?? 0)).toBe(0);
  });

  it('does not read an unchanged sheet again, nor raise the same change twice', async () => {
    edit(0, EDITABLE_TRANSACTION_COLUMNS.note, 'Check the lease');
    await checkSheets(ctx, google.api);
    expect(await checkSheets(ctx, google.api)).toEqual({ read: 0, added: 0, stopped: null });
    edit(1, EDITABLE_TRANSACTION_COLUMNS.note, '');
    expect((await checkSheets(ctx, google.api)).added).toBe(0);
    expect(listChanges(ctx.db, 'waiting')).toHaveLength(1);
  });

  it('withdraws a proposal when the cell goes back to what was published', async () => {
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Insurance');
    await checkSheets(ctx, google.api);
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Rent');
    await checkSheets(ctx, google.api);
    expect(listChanges(ctx.db, 'waiting')).toEqual([]);
    expect(listChanges(ctx.db, 'withdrawn')).toHaveLength(1);
  });

  it('says "not recognised" for an account that is not in the books, and cannot accept it', async () => {
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Rent and stuff');
    await checkSheets(ctx, google.api);
    const change = changesView(ctx).waiting[0];
    expect(change?.blocked).toBe('not-recognised');
    expect(acceptChange(ctx, change?.id ?? '')).toEqual({ ok: false, error: 'not-recognised' });
    expect(accountOf(refAt(0))).toBe('Rent');
  });
});

describe('accepting and rejecting (spec 117)', () => {
  it('accept changes the entry through the posting service, with an audit row naming the change', async () => {
    const entryId = refAt(0);
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'insurance');
    await checkSheets(ctx, google.api);
    const change = changesView(ctx).waiting[0];
    expect(acceptChange(ctx, change?.id ?? '')).toEqual({ ok: true, value: undefined });
    expect(accountOf(entryId)).toBe('Insurance');
    const audit = listAudit(ctx.db);
    expect(audit.some((a) => a.kind === 'entry.change' && a.rowId === entryId)).toBe(true);
    const named = audit.find((a) => a.kind === 'accountant-change.accept');
    expect(named?.after).toMatchObject({ entryId, field: 'account', now: 'insurance' });
    expect(changesView(ctx).done[0]).toMatchObject({ status: 'accepted', now: 'insurance' });
  });

  it('a GST code change works the GST out again', async () => {
    const entryId = refAt(0);
    edit(0, EDITABLE_TRANSACTION_COLUMNS.gst, 'FRE');
    await checkSheets(ctx, google.api);
    acceptChange(ctx, changesView(ctx).waiting[0]?.id ?? '');
    const entry = getJournalEntry(ctx.db, entryId);
    expect(entry?.lines.every((l) => l.gst === 0)).toBe(true);
  });

  it('reject keeps the books, and the same value is not raised again until the next publish', async () => {
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Insurance');
    await checkSheets(ctx, google.api);
    const id = changesView(ctx).waiting[0]?.id ?? '';
    expect(rejectChange(ctx, id)).toEqual({ ok: true, value: undefined });
    edit(1, EDITABLE_TRANSACTION_COLUMNS.note, 'Something else');
    await checkSheets(ctx, google.api);
    expect(changesView(ctx).waiting.map((c) => c.field)).toEqual(['note']);
    expect(accountOf(refAt(0))).toBe('Rent');
    expect(listAudit(ctx.db).some((a) => a.kind === 'accountant-change.reject')).toBe(true);
  });

  it('a change in a locked period cannot be accepted, and says why', async () => {
    await publish('last-quarter');
    const locked = parseCalendarDate('2026-09-30', 'YYYY-MM-DD');
    if (!locked.ok) throw new Error('date');
    expect(lockPeriod(ctx, locked.value).ok).toBe(true);
    edit(0, EDITABLE_TRANSACTION_COLUMNS.account, 'Insurance');
    await checkSheets(ctx, google.api);
    const change = changesView(ctx).waiting.find((c) => c.linkId === linkId);
    expect(change?.blocked).toBe('locked');
    expect(acceptChange(ctx, change?.id ?? '')).toEqual({ ok: false, error: 'locked' });
  });
});
