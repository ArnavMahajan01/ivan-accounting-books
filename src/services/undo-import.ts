// Taking an import back (spec 063a). Only the file imported last for an account can be undone, and
// only while every line it added is still waiting for review, so nothing already posted is touched.
// Its lines and the batch go together, with an audit row, in one transaction. The same file can then
// be imported again, because its keys are free.

import { getBankAccountById } from '@data/bank-account-repository';
import {
  countUsedLinesInBatch,
  deleteBatchWithLines,
  getImportBatch,
  lastImportedBatch,
} from '@data/statement-repository';
import { err, ok, type Result } from '@shared/result';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export type UndoRefusal = 'not-found' | 'not-the-latest' | 'lines-already-used';

export interface UndoSummary {
  readonly removed: number;
  readonly fileName: string;
}

export function undoImport(ctx: ServiceContext, batchId: string): Result<UndoSummary, UndoRefusal> {
  return ctx.db.transaction((): Result<UndoSummary, UndoRefusal> => {
    const batch = getImportBatch(ctx.db, batchId);
    if (batch === null) return err('not-found');
    const account = getBankAccountById(ctx.db, batch.bankAccountId);
    if (account === null) return err('not-found');
    if (lastImportedBatch(ctx.db, account.id)?.id !== batch.id) return err('not-the-latest');
    if (countUsedLinesInBatch(ctx.db, batch.id) > 0) return err('lines-already-used');

    const removed = deleteBatchWithLines(ctx.db, batch.id);
    recordAudit(ctx, {
      kind: 'import.undo',
      table: 'import_batch',
      rowId: batch.id,
      before: batch,
      after: null,
    });
    return ok({ removed, fileName: batch.fileName });
  })();
}
