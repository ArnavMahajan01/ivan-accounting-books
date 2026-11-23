// The posting service: the single writer of the books (invariants 1, 3 and 6, risk L1). It
// refuses anything that does not balance, falls in a locked period or breaks another rule in
// `validateEntry`, and writes the entry, its lines and the audit row in one transaction. If
// anything fails, nothing is saved.
//
// A posted entry may be changed or removed here, unless it is on or before the lock date. The
// audit row keeps its full content before and after, and for a removal the full content before
// (decided on the recommendation at spec 040, author to confirm: architecture-context.md, "Data Model").

import { getAccountById } from '@data/account-repository';
import { getBusiness } from '@data/business-repository';
import { getContactById } from '@data/contact-repository';
import { entryLineTotal, getJournalEntry } from '@data/journal-queries';
import {
  deleteJournalEntry,
  deleteJournalLines,
  insertJournalEntry,
  insertJournalLine,
  updateJournalEntry,
} from '@data/journal-writes';
import {
  isLocked,
  validateEntry,
  type EntryContext,
  type EntryInput,
  type EntryProblem,
  type JournalEntry,
  type JournalLine,
} from '@domain/journal';
import type { CalendarDate } from '@shared/dates';
import { newId } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export type PostError =
  | { readonly code: 'business-not-set-up' }
  | { readonly code: 'invalid-entry'; readonly problems: readonly EntryProblem[] };

/** What the check needs from the books: the lock date, and each account the entry names. */
export function loadEntryContext(
  ctx: ServiceContext,
  entry: EntryInput,
): Result<EntryContext, PostError> {
  const business = getBusiness(ctx.db);
  if (business === null) return err({ code: 'business-not-set-up' });
  const accounts = new Map<string, { active: boolean }>();
  for (const line of entry.lines) {
    const account = getAccountById(ctx.db, line.accountId);
    if (account !== null) accounts.set(account.id, { active: account.active });
  }
  const contacts = new Set<string>();
  for (const line of entry.lines) {
    if (line.payeeId !== null && getContactById(ctx.db, line.payeeId) !== null) {
      contacts.add(line.payeeId);
    }
  }
  return ok({ accounts, contacts, lockDate: business.lockDate });
}

export function postEntry(ctx: ServiceContext, input: EntryInput): Result<JournalEntry, PostError> {
  return ctx.db.transaction((): Result<JournalEntry, PostError> => {
    const context = loadEntryContext(ctx, input);
    if (!context.ok) return context;
    const problems = validateEntry(input, context.value);
    if (problems.length > 0) return err({ code: 'invalid-entry', problems });

    const now = ctx.clock.now();
    const id = newId('ent', ctx.random);
    insertJournalEntry(ctx.db, {
      id,
      date: input.date,
      memo: input.memo,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      lines: [],
      createdAt: now,
      updatedAt: now,
    });
    const lines: JournalLine[] = [];
    input.lines.forEach((line, position) => {
      const saved: JournalLine = { ...line, id: newId('lin', ctx.random) };
      insertJournalLine(ctx.db, id, position, saved);
      lines.push(saved);
    });
    // The lines were checked before they were written. This confirms what was written, so that an
    // entry which does not balance can never be committed, whatever the cause.
    if (entryLineTotal(ctx.db, id) !== 0) throw new Error('The saved lines do not sum to zero');

    const posted: JournalEntry = {
      id,
      date: input.date,
      memo: input.memo,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      lines,
      createdAt: now,
      updatedAt: now,
    };
    recordAudit(ctx, {
      kind: 'entry.post',
      table: 'journal_entry',
      rowId: id,
      before: null,
      after: posted,
    });
    return ok(posted);
  })();
}

export type ChangeError =
  | PostError
  | { readonly code: 'entry-not-found' }
  | { readonly code: 'entry-locked'; readonly lockDate: CalendarDate };

/** The existing entry, if it may still be changed. A locked one never may (invariant 6). */
function findChangeable(ctx: ServiceContext, entryId: string): Result<JournalEntry, ChangeError> {
  const business = getBusiness(ctx.db);
  if (business === null) return err({ code: 'business-not-set-up' });
  const existing = getJournalEntry(ctx.db, entryId);
  if (existing === null) return err({ code: 'entry-not-found' });
  if (business.lockDate !== null && isLocked(existing.date, business.lockDate)) {
    return err({ code: 'entry-locked', lockDate: business.lockDate });
  }
  return ok(existing);
}

/**
 * Replaces a posted entry's date, memo, source and lines with `input`. It keeps its id. The new
 * content is checked like any entry, so it must balance and must not fall in a locked period.
 */
export function changeEntry(
  ctx: ServiceContext,
  entryId: string,
  input: EntryInput,
): Result<JournalEntry, ChangeError> {
  return ctx.db.transaction((): Result<JournalEntry, ChangeError> => {
    const existing = findChangeable(ctx, entryId);
    if (!existing.ok) return existing;
    const context = loadEntryContext(ctx, input);
    if (!context.ok) return context;
    const problems = validateEntry(input, context.value);
    if (problems.length > 0) return err({ code: 'invalid-entry', problems });

    const changed: JournalEntry = {
      ...existing.value,
      date: input.date,
      memo: input.memo,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      lines: [],
      updatedAt: ctx.clock.now(),
    };
    updateJournalEntry(ctx.db, changed);
    deleteJournalLines(ctx.db, entryId);
    const lines: JournalLine[] = [];
    input.lines.forEach((line, position) => {
      const saved: JournalLine = { ...line, id: newId('lin', ctx.random) };
      insertJournalLine(ctx.db, entryId, position, saved);
      lines.push(saved);
    });
    if (entryLineTotal(ctx.db, entryId) !== 0)
      throw new Error('The saved lines do not sum to zero');

    const after: JournalEntry = { ...changed, lines };
    recordAudit(ctx, {
      kind: 'entry.change',
      table: 'journal_entry',
      rowId: entryId,
      before: existing.value,
      after,
    });
    return ok(after);
  })();
}

/** Removes a posted entry and its lines. The audit row keeps all of it, so nothing is lost. */
export function removeEntry(ctx: ServiceContext, entryId: string): Result<void, ChangeError> {
  return ctx.db.transaction((): Result<void, ChangeError> => {
    const existing = findChangeable(ctx, entryId);
    if (!existing.ok) return existing;
    deleteJournalLines(ctx.db, entryId);
    deleteJournalEntry(ctx.db, entryId);
    recordAudit(ctx, {
      kind: 'entry.remove',
      table: 'journal_entry',
      rowId: entryId,
      before: existing.value,
      after: null,
    });
    return ok(undefined);
  })();
}
