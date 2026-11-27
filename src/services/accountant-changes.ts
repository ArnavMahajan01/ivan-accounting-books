// The accountant's changes (specs 116, 117; invariant 3). What the sheet holds in the columns he
// may change is compared with what was published, and each difference is kept as a proposal.
// Nothing changes the books until the client accepts one here: accepting rebuilds the entry
// through the posting service (its own audit row), plus a row naming the accountant's change.

import { listAccounts } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import {
  countWaiting,
  changesForLink,
  getChange,
  insertChange,
  listChanges,
  updateChange,
  type AccountantChange,
} from '@data/accountant-change-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getBusiness } from '@data/business-repository';
import { getJournalEntry } from '@data/journal-queries';
import { getSheetLink, type SheetLink } from '@data/sheet-link-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { isLocked } from '@domain/journal';
import type { CalendarDate } from '@shared/dates';
import { newId } from '@shared/ids';
import { addCents, negateCents, ZERO_CENTS, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { AccountantChangesView, ChangeBlock, ChangeView } from '@shared/sheets';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import {
  planSimpleRebuild,
  rebuildSimpleEntry,
  type MoveFailure,
  type SimpleChange,
} from './fix-entry';

/** One row of the Transactions sheet as read back: the Ref, and the columns he may change. */
export interface ReadBackRow {
  readonly rowKey: string;
  /** The sheet's row number, from 1. */
  readonly sheetRow: number;
  readonly account: string;
  readonly gst: string;
  readonly note: string;
}

/** A note longer than this is cut: a cell can hold far more than a line's note should. */
const NOTE_LIMIT = 500;

const clean = (text: string) => text.trim().replace(/\s+/g, ' ');

/**
 * Keeps each difference between the sheet and what was published as a waiting proposal. A
 * proposal already waiting is updated if he changed the cell again, and withdrawn if the cell went
 * back to what was published. One he rejected or accepted since the last publish is not raised
 * again. Returns how many are new.
 */
export function recordReadBack(
  ctx: ServiceContext,
  link: SheetLink,
  rows: readonly ReadBackRow[],
  by: string | null,
): number {
  return ctx.db.transaction(() => {
    const now = ctx.clock.now();
    const existing = changesForLink(ctx.db, link.id);
    let added = 0;
    for (const row of rows) {
      const published = link.publishedValues[row.rowKey]?.editable;
      if (published === undefined || published === null) continue;
      for (const field of ['account', 'gst', 'note'] as const) {
        const was = published[field];
        const sheet = field === 'note' ? row.note.slice(0, NOTE_LIMIT) : clean(row[field]);
        const mine = existing.filter((c) => c.rowKey === row.rowKey && c.field === field);
        const waiting = mine.find((c) => c.status === 'waiting');
        if (sheet === was) {
          if (waiting !== undefined) {
            updateChange(ctx.db, { ...waiting, status: 'withdrawn', decidedAt: now }, now);
          }
          continue;
        }
        if (waiting !== undefined) {
          if (waiting.newValue !== sheet) {
            updateChange(
              ctx.db,
              { ...waiting, newValue: sheet, sheetRow: row.sheetRow, changedBy: by, seenAt: now },
              now,
            );
          }
          continue;
        }
        // Decided since the last publish: the sheet keeps showing it until he publishes again.
        const decided = mine.some(
          (c) =>
            (c.status === 'rejected' || c.status === 'accepted') &&
            c.newValue === sheet &&
            (link.publishedAt === null || (c.decidedAt ?? '') >= link.publishedAt),
        );
        if (decided) continue;
        insertChange(
          ctx.db,
          {
            id: newId('chg', ctx.random),
            linkId: link.id,
            rowKey: row.rowKey,
            sheetRow: row.sheetRow,
            field,
            oldValue: was,
            newValue: sheet,
            changedBy: by,
            seenAt: now,
            status: 'waiting',
            decidedAt: null,
          },
          now,
        );
        added += 1;
      }
    }
    return added;
  })();
}

/** What the books would hold for a change: the account or GST code he typed, if it is one. */
function resolver(ctx: ReadContext) {
  const banks = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId as string));
  const special = new Set([accountForRole(ctx.db, 'gst'), accountForRole(ctx.db, 'transfers')]);
  const accounts = listAccounts(ctx.db).filter(
    (a) => a.active && !banks.has(a.id) && !special.has(a.id),
  );
  const codes = listTaxCodes(ctx.db).filter((t) => t.active);
  const same = (a: string, b: string) =>
    a.toLocaleLowerCase('en-AU') === b.toLocaleLowerCase('en-AU');
  return {
    account: (text: string) =>
      accounts.find(
        (a) => same(a.name, text) || same(a.code, text) || same(`${a.code} ${a.name}`, text),
      ) ?? null,
    taxCode: (text: string) => codes.find((t) => same(t.shortCode, text)) ?? null,
    names: new Map(listAccounts(ctx.db).map((a) => [a.id as string, a.name])),
  };
}

type Resolver = ReturnType<typeof resolver>;

/** The change as the posting service takes it, or null when what he typed is not in the books. */
function chooseFor(change: AccountantChange, find: Resolver) {
  return (current: SimpleChange): SimpleChange | null => {
    switch (change.field) {
      case 'account': {
        const account = find.account(change.newValue);
        return account === null ? null : { ...current, accountId: account.id };
      }
      case 'gst': {
        if (change.newValue === '') return { ...current, taxCodeId: null };
        const code = find.taxCode(change.newValue);
        return code === null ? null : { ...current, taxCodeId: code.id };
      }
      case 'note':
        return { ...current, note: change.newValue };
    }
  };
}

/** Whether what he typed is an account or GST code in the books. A note is always fine. */
function isRecognised(change: AccountantChange, find: Resolver): boolean {
  switch (change.field) {
    case 'account':
      return find.account(change.newValue) !== null;
    case 'gst':
      return change.newValue === '' || find.taxCode(change.newValue) !== null;
    case 'note':
      return true;
  }
}

/** Why a rebuild could not be planned or saved, in the screen's words. */
function blockOf(failure: MoveFailure): ChangeBlock | null {
  switch (failure) {
    case 'unchanged':
      return null;
    case 'not-movable':
      return 'not-simple';
    case 'not-found':
      return 'gone';
    case 'locked':
      return 'locked';
    case 'invalid':
      return 'not-recognised';
  }
}

/** What accepting would do, worked out from the rebuilt entry, or why it cannot be accepted. */
function workOut(
  ctx: ServiceContext,
  change: AccountantChange,
  find: Resolver,
  lockDate: CalendarDate | null,
): { effect: ChangeView['effect']; blocked: ChangeBlock | null } {
  const entry = getJournalEntry(ctx.db, change.rowKey);
  if (entry === null) return { effect: null, blocked: 'gone' };
  if (lockDate !== null && isLocked(entry.date, lockDate))
    return { effect: null, blocked: 'locked' };
  if (!isRecognised(change, find)) return { effect: null, blocked: 'not-recognised' };
  const choose = chooseFor(change, find);
  const plan = planSimpleRebuild(ctx, change.rowKey, (current) => choose(current) ?? current);
  // Unchanged: the books already hold what he typed, so accepting only records it.
  if (!plan.ok)
    return { effect: plan.error === 'unchanged' ? [] : null, blocked: blockOf(plan.error) };
  const sums = new Map<string, Cents>();
  for (const l of plan.value.entry.lines) {
    sums.set(l.accountId, addCents(sums.get(l.accountId) ?? ZERO_CENTS, negateCents(l.amount)));
  }
  for (const l of plan.value.next.lines) {
    sums.set(l.accountId, addCents(sums.get(l.accountId) ?? ZERO_CENTS, l.amount));
  }
  return {
    effect: [...sums.entries()]
      .filter(([, cents]) => cents !== 0)
      .map(([id, cents]) => ({ account: find.names.get(id) ?? id, cents })),
    blocked: null,
  };
}

export function changesView(ctx: ServiceContext): AccountantChangesView {
  const find = resolver(ctx);
  const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
  const titles = new Map<string, string>();
  const view = (change: AccountantChange): ChangeView => {
    if (!titles.has(change.linkId)) {
      titles.set(change.linkId, getSheetLink(ctx.db, change.linkId)?.title ?? '');
    }
    const entry = getJournalEntry(ctx.db, change.rowKey);
    const banks = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId as string));
    const bankAmount = entry?.lines
      .filter((l) => banks.has(l.accountId))
      .reduce((sum, l) => addCents(sum, l.amount), ZERO_CENTS);
    const worked =
      change.status === 'waiting'
        ? workOut(ctx, change, find, lockDate)
        : { effect: null, blocked: null };
    return {
      id: change.id,
      linkId: change.linkId,
      sheetTitle: titles.get(change.linkId) ?? '',
      line:
        entry === null
          ? null
          : { date: entry.date, description: entry.memo, amount: bankAmount ?? ZERO_CENTS },
      sheetRow: change.sheetRow,
      field: change.field,
      was: change.oldValue,
      now: change.newValue,
      by: change.changedBy,
      seenAt: change.seenAt,
      status: change.status,
      decidedAt: change.decidedAt,
      effect: worked.effect,
      blocked: worked.blocked,
    };
  };
  return {
    waiting: listChanges(ctx.db, 'waiting')
      .map(view)
      .sort((a, b) => a.sheetRow - b.sheetRow),
    done: [...listChanges(ctx.db, 'accepted'), ...listChanges(ctx.db, 'rejected')]
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
      .slice(0, 50)
      .map(view),
    lockDate,
  };
}

export type DecisionRefusal = ChangeBlock | 'not-waiting';

function decided(ctx: ServiceContext, change: AccountantChange, status: 'accepted' | 'rejected') {
  const after: AccountantChange = { ...change, status, decidedAt: ctx.clock.now() };
  updateChange(ctx.db, after, ctx.clock.now());
  recordAudit(ctx, {
    kind: status === 'accepted' ? 'accountant-change.accept' : 'accountant-change.reject',
    table: 'accountant_change',
    rowId: change.id,
    before: { status: change.status },
    after: {
      status,
      entryId: change.rowKey,
      field: change.field,
      was: change.oldValue,
      now: change.newValue,
      by: change.changedBy,
    },
  });
}

/** Applies one change to the books through the posting service, and records that he accepted it. */
export function acceptChange(ctx: ServiceContext, id: string): Result<void, DecisionRefusal> {
  return ctx.db.transaction((): Result<void, DecisionRefusal> => {
    const change = getChange(ctx.db, id);
    if (change === null || change.status !== 'waiting') return err('not-waiting');
    const find = resolver(ctx);
    const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
    const checked = workOut(ctx, change, find, lockDate);
    if (checked.blocked !== null) return err(checked.blocked);
    const choose = chooseFor(change, find);
    const done = rebuildSimpleEntry(ctx, change.rowKey, (current) => choose(current) ?? current);
    // The books already hold what he typed: accepting only records it.
    if (!done.ok) {
      const block = blockOf(done.error);
      if (block !== null) return err(block);
    }
    decided(ctx, change, 'accepted');
    return ok(undefined);
  })();
}

/** Keeps the books as they are. The sheet shows his value, flagged, until the next publish. */
export function rejectChange(ctx: ServiceContext, id: string): Result<void, 'not-waiting'> {
  return ctx.db.transaction((): Result<void, 'not-waiting'> => {
    const change = getChange(ctx.db, id);
    if (change === null || change.status !== 'waiting') return err('not-waiting');
    decided(ctx, change, 'rejected');
    return ok(undefined);
  })();
}

export function waitingCount(ctx: ReadContext): number {
  return countWaiting(ctx.db);
}
