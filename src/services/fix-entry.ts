// Changing the account of posted entries from Transactions (spec 083). An entry that moved money
// through one bank account for one account is rebuilt for the new account, with GST worked out
// again from that account's usual code, and saved through `changeEntry`, so it keeps its id, its
// date and its history, and the change has its audit row. A locked entry never changes.

import { getAccountById } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { getJournalEntry } from '@data/journal-queries';
import { getTaxCodeById } from '@data/tax-code-repository';
import { lineToEntry } from '@domain/line-to-entry';
import { asCents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { MoveOutcome } from '@shared/views';
import type { ServiceContext } from './context';
import { changeEntry } from './post-journal';

type MoveFailure = MoveOutcome['failed'][number]['reason'];

export function moveEntryToAccount(
  ctx: ServiceContext,
  entryId: string,
  accountId: string,
): Result<void, MoveFailure> {
  return ctx.db.transaction((): Result<void, MoveFailure> => {
    const entry = getJournalEntry(ctx.db, entryId);
    if (entry === null) return err('not-found');
    const target = getAccountById(ctx.db, accountId);
    const gst = accountForRole(ctx.db, 'gst');
    const bankLedger = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId));
    if (
      target === null ||
      !target.active ||
      bankLedger.has(target.id) ||
      target.id === accountForRole(ctx.db, 'transfers')
    ) {
      return err('invalid');
    }
    const banks = entry.lines.filter((l) => bankLedger.has(l.accountId));
    const others = entry.lines.filter((l) => !bankLedger.has(l.accountId) && l.accountId !== gst);
    const bank = banks[0];
    const old = others[0];
    if (banks.length !== 1 || others.length !== 1 || bank === undefined || old === undefined) {
      return err('not-movable');
    }
    if (old.accountId === target.id) return err('unchanged');
    if (gst === null) return err('invalid');

    const code =
      target.defaultTaxCodeId === null ? null : getTaxCodeById(ctx.db, target.defaultTaxCodeId);
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
    const changed = changeEntry(ctx, entry.id, {
      ...rebuilt.value,
      memo: entry.memo,
      sourceKind: entry.sourceKind,
      sourceId: entry.sourceId,
    });
    if (!changed.ok) return err(changed.error.code === 'entry-locked' ? 'locked' : 'invalid');
    return ok(undefined);
  })();
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
