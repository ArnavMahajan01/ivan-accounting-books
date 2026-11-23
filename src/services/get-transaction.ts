// One entry in full, for the panel beside the Transactions list (spec 052): its lines, and its
// history from the audit log, worded so a person can read what each change did.

import { z } from 'zod';
import { getAccountById } from '@data/account-repository';
import { listAudit } from '@data/audit-repository';
import { getBusiness } from '@data/business-repository';
import { getContactById } from '@data/contact-repository';
import { getJournalEntry } from '@data/journal-queries';
import { getTaxCodeById } from '@data/tax-code-repository';
import { describeEntryChange } from '@domain/entry-diff';
import { isLocked, type JournalEntry } from '@domain/journal';
import { asCents, negateCents, sumCents } from '@shared/money';
import { ENTRY_SOURCE_KINDS } from '@shared/kinds';
import type { TransactionDetail, TransactionHistoryItem, TransactionLineView } from '@shared/views';
import type { ReadContext } from './context';

// The audit log holds an entry as JSON. It is read back through this schema before it is trusted.
const snapshotSchema = z.object({
  date: z.string(),
  memo: z.string(),
  sourceKind: z.enum(ENTRY_SOURCE_KINDS),
  sourceId: z.string().nullable(),
  lines: z.array(
    z.object({
      id: z.string(),
      accountId: z.string(),
      amount: z.number().int(),
      taxCodeId: z.string().nullable(),
      gst: z.number().int(),
      payeeId: z.string().nullable(),
      memo: z.string(),
    }),
  ),
});

export function getTransaction(ctx: ReadContext, id: string): TransactionDetail | null {
  const entry = getJournalEntry(ctx.db, id);
  if (entry === null) return null;

  const accountName = (accountId: string): string =>
    getAccountById(ctx.db, accountId)?.name ?? 'an account that no longer exists';
  const payeeName = (payeeId: string): string =>
    getContactById(ctx.db, payeeId)?.name ?? 'someone no longer listed';

  const lines: TransactionLineView[] = entry.lines.map((line) => {
    const account = getAccountById(ctx.db, line.accountId);
    return {
      accountId: line.accountId,
      accountCode: account?.code ?? '',
      accountName: account?.name ?? 'Unknown account',
      debit: line.amount > 0 ? line.amount : asCents(0),
      credit: line.amount < 0 ? negateCents(line.amount) : asCents(0),
      gst: line.gst,
      taxCode:
        line.taxCodeId === null
          ? null
          : (getTaxCodeById(ctx.db, line.taxCodeId)?.shortCode ?? null),
      payee: line.payeeId === null ? null : payeeName(line.payeeId),
    };
  });
  const total = sumCents(lines.map((l) => l.debit));
  const gst = sumCents(entry.lines.map((l) => asCents(Math.abs(l.gst))));

  const history: TransactionHistoryItem[] = [];
  for (const record of listAudit(ctx.db, { table: 'journal_entry', rowId: id })) {
    if (record.kind === 'entry.post') {
      history.push({ kind: 'posted', at: record.changedAt, changes: [] });
    } else if (record.kind === 'entry.change') {
      const before = snapshotSchema.safeParse(record.before);
      const after = snapshotSchema.safeParse(record.after);
      history.push({
        kind: 'changed',
        at: record.changedAt,
        changes:
          before.success && after.success
            ? describeEntryChange(asEntry(entry, before.data), asEntry(entry, after.data), {
                account: accountName,
                payee: payeeName,
              })
            : ['The entry was changed'],
      });
    }
  }

  const lockDate = getBusiness(ctx.db)?.lockDate ?? null;
  return {
    id: entry.id,
    date: entry.date,
    memo: entry.memo,
    sourceKind: entry.sourceKind,
    payee: lines.find((l) => l.payee !== null)?.payee ?? null,
    lines,
    beforeGst: asCents(total - gst),
    gst,
    total,
    locked: isLocked(entry.date, lockDate),
    history,
  };
}

/** A snapshot from the audit log, as an entry, so the same wording code can compare two of them. */
function asEntry(current: JournalEntry, snapshot: z.output<typeof snapshotSchema>): JournalEntry {
  return {
    ...current,
    date: snapshot.date as JournalEntry['date'],
    memo: snapshot.memo,
    sourceKind: snapshot.sourceKind,
    sourceId: snapshot.sourceId,
    lines: snapshot.lines.map((l) => ({
      id: l.id as JournalEntry['lines'][number]['id'],
      accountId: l.accountId as JournalEntry['lines'][number]['accountId'],
      amount: asCents(l.amount),
      taxCodeId: l.taxCodeId as JournalEntry['lines'][number]['taxCodeId'],
      gst: asCents(l.gst),
      payeeId: l.payeeId,
      memo: l.memo,
    })),
  };
}
