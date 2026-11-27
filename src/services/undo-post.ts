// Undo the last post in To review (spec 075): one line, or every line of a batch, in one
// transaction. Everything is checked first, so either all of it goes back or none does.
//
// An entry the post made (its source is one of the lines) is removed through the posting service,
// which keeps it in the audit log. An entry the line was only matched with stays: the link goes.
// Every line linked to a removed entry goes back to To review (both sides of a paired transfer),
// and a line paired with one that goes back loses its pair, so it waits for its other side again.

import { deletePaymentsForEntry } from '@data/invoice-payment-repository';
import { getBusiness } from '@data/business-repository';
import { getJournalEntry } from '@data/journal-queries';
import { reconciledLineIds } from '@data/reconcile-repository';
import {
  getReviewLine,
  linesForEntry,
  markLineWaiting,
  setPairedLine,
  type ReviewLine,
} from '@data/review-repository';
import { isLocked, type JournalEntry } from '@domain/journal';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';
import { removeEntry } from './post-journal';

export type UndoPostRefusal = 'locked' | 'not-posted' | 'reconciled';

export function undoPost(
  ctx: ServiceContext,
  lineIds: readonly string[],
): Result<{ readonly lines: number }, UndoPostRefusal> {
  return ctx.db.transaction((): Result<{ readonly lines: number }, UndoPostRefusal> => {
    const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
    const entries = new Map<string, JournalEntry>();
    const lines: ReviewLine[] = [];
    for (const id of new Set(lineIds)) {
      const line = getReviewLine(ctx.db, id);
      if (line?.status !== 'posted' || line.entryId === null) return err('not-posted');
      const entry = getJournalEntry(ctx.db, line.entryId);
      if (entry === null) return err('not-posted');
      if (isLocked(entry.date, lockDate)) return err('locked');
      entries.set(entry.id, entry);
      lines.push(line);
    }

    // Every line going back: the ones named, and any other line posted by the same entry.
    const back = new Map<string, ReviewLine>(lines.map((l) => [l.id, l]));
    for (const entry of entries.values()) {
      for (const line of linesForEntry(ctx.db, entry.id)) back.set(line.id, line);
    }
    // A line a reconciliation covers stays as it is (spec 085).
    if (reconciledLineIds(ctx.db, [...back.keys()]).size > 0) return err('reconciled');
    for (const line of back.values()) {
      markLineWaiting(ctx.db, line.id);
      if (line.pairedLineId !== null && !back.has(line.pairedLineId)) {
        setPairedLine(ctx.db, line.pairedLineId, null);
      }
      recordAudit(ctx, {
        kind: 'line.unpost',
        table: 'statement_line',
        rowId: line.id,
        before: { status: 'posted', entryId: line.entryId, pairedLineId: line.pairedLineId },
        after: { status: 'to-review' },
      });
    }
    for (const entry of entries.values()) {
      const madeByPosting = entry.sourceKind === 'bank-line' && back.has(entry.sourceId ?? '');
      if (!madeByPosting) continue;
      // A deposit matched to invoices (spec 129): the invoices are owed again.
      deletePaymentsForEntry(ctx.db, entry.id);
      const removed = removeEntry(ctx, entry.id);
      // The lock and the entry were checked above, inside this transaction, so this cannot fail.
      if (!removed.ok) throw new Error(`Undo could not remove ${entry.id}: ${removed.error.code}`);
    }
    return ok({ lines: back.size });
  })();
}
