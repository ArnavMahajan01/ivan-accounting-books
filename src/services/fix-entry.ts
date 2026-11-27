// Changing the account of posted entries from Transactions (spec 083), and the rebuild that
// accepting an accountant's change shares (spec 117). An entry that moved money
// through one bank account for one account is rebuilt for the new account, with GST worked out
// again from that account's usual code, and saved through `changeEntry`, so it keeps its id, its
// date and its history, and the change has its audit row. A locked entry never changes.

import { getAccountById } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getJournalEntry } from '@data/journal-queries';
import { getTaxCodeById } from '@data/tax-code-repository';
import { lineToEntry } from '@domain/line-to-entry';
import type { EntryInput, JournalEntry } from '@domain/journal';
import { asCents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { MoveOutcome } from '@shared/views';
import type { ServiceContext } from './context';
import { changeEntry } from './post-journal';

export type MoveFailure = MoveOutcome['failed'][number]['reason'];

/** What a simple entry's other side becomes: its account, GST code and note. */
export interface SimpleChange {
  readonly accountId: string;
  /** Null for no GST code. */
  readonly taxCodeId: string | null;
  readonly note: string;
}

/**
 * Rebuilds an entry that moved money through one bank account for one account (a "simple" one)
 * with a new account, GST code or note, the GST worked out again from the amount, and saves it
 * through `changeEntry`: it keeps its id, date and history, and the change has its audit row. Used
 * by "Move to…" (spec 083) and by accepting an accountant's change (spec 117).
 */
/** The entry as it is, and as it would be after a simple change: worked out, not saved. */
export interface SimpleRebuild {
  readonly entry: JournalEntry;
  readonly next: EntryInput;
}

export function planSimpleRebuild(
  ctx: ServiceContext,
  entryId: string,
  choose: (current: SimpleChange) => SimpleChange,
): Result<SimpleRebuild, MoveFailure> {
  const entry = getJournalEntry(ctx.db, entryId);
  if (entry === null) return err('not-found');
  const gst = accountForRole(ctx.db, 'gst');
  const bankLedger = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId));
  const banks = entry.lines.filter((l) => bankLedger.has(l.accountId));
  const others = entry.lines.filter((l) => !bankLedger.has(l.accountId) && l.accountId !== gst);
  const bank = banks[0];
  const old = others[0];
  if (banks.length !== 1 || others.length !== 1 || bank === undefined || old === undefined) {
    return err('not-movable');
  }
  if (gst === null) return err('invalid');
  const current: SimpleChange = {
    accountId: old.accountId,
    taxCodeId: old.taxCodeId,
    note: old.memo,
  };
  const next = choose(current);
  if (
    next.accountId === current.accountId &&
    next.taxCodeId === current.taxCodeId &&
    next.note === current.note
  ) {
    return err('unchanged');
  }
  const target = getAccountById(ctx.db, next.accountId);
  if (
    target === null ||
    !target.active ||
    bankLedger.has(target.id) ||
    target.id === accountForRole(ctx.db, 'transfers')
  ) {
    return err('invalid');
  }
  const code = next.taxCodeId === null ? null : getTaxCodeById(ctx.db, next.taxCodeId);
  if (next.taxCodeId !== null && code === null) return err('invalid');
  const rebuilt = lineToEntry({
    line: {
      id: entry.sourceId ?? entry.id,
      date: entry.date,
      description: entry.memo,
      amount: bank.amount,
    },
    bankLedgerAccountId: bank.accountId,
    parts: [
      {
        accountId: target.id,
        tax:
          code === null
            ? null
            : { taxCodeId: code.id, treatment: code.treatment, rateBp: code.rateBp },
        gross: asCents(Math.abs(bank.amount)),
      },
    ],
    payeeId: old.payeeId,
    gstAccountId: gst,
  });
  if (!rebuilt.ok) return err('invalid');
  return ok({
    entry,
    next: {
      ...rebuilt.value,
      lines: rebuilt.value.lines.map((l) =>
        l.accountId === target.id ? { ...l, memo: next.note } : l,
      ),
      memo: entry.memo,
      sourceKind: entry.sourceKind,
      sourceId: entry.sourceId,
    },
  });
}

/**
 * Rebuilds an entry that moved money through one bank account for one account (a "simple" one)
 * with a new account, GST code or note, the GST worked out again from the amount, and saves it
 * through `changeEntry`: it keeps its id, date and history, and the change has its audit row. Used
 * by "Move to…" (spec 083) and by accepting an accountant's change (spec 117).
 */
export function rebuildSimpleEntry(
  ctx: ServiceContext,
  entryId: string,
  choose: (current: SimpleChange) => SimpleChange,
): Result<void, MoveFailure> {
  return ctx.db.transaction((): Result<void, MoveFailure> => {
    const plan = planSimpleRebuild(ctx, entryId, choose);
    if (!plan.ok) return plan;
    const changed = changeEntry(ctx, entryId, plan.value.next);
    if (!changed.ok) return err(changed.error.code === 'entry-locked' ? 'locked' : 'invalid');
    return ok(undefined);
  })();
}

/** "Move to…" (spec 083): the new account, with GST worked out again from its usual code. */
export function moveEntryToAccount(
  ctx: ServiceContext,
  entryId: string,
  accountId: string,
): Result<void, MoveFailure> {
  const target = getAccountById(ctx.db, accountId);
  if (target === null)
    return getJournalEntry(ctx.db, entryId) === null ? err('not-found') : err('invalid');
  return rebuildSimpleEntry(ctx, entryId, (current) => ({
    accountId,
    taxCodeId: current.accountId === accountId ? current.taxCodeId : target.defaultTaxCodeId,
    note: current.note,
  }));
}

/** "Move to…": each entry changed on its own, each with its audit row. */
export function moveEntries(
  ctx: ServiceContext,
  entryIds: readonly string[],
  accountId: string,
): MoveOutcome {
  const moved: string[] = [];
  const failed: { entryId: string; reason: MoveFailure }[] = [];
  for (const id of entryIds) {
    const result = moveEntryToAccount(ctx, id, accountId);
    if (result.ok) moved.push(id);
    else failed.push({ entryId: id, reason: result.error });
  }
  return { moved, failed };
}
