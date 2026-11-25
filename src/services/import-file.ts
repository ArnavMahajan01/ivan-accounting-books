// Importing a statement file, in two steps. `previewImport` reads the file's text and works out
// everything the preview shows, writing nothing (spec 062). `commitImport` saves a previewed
// import in one transaction, so a crash can never leave half a file in the books (spec 063). The
// file itself is read in the main process, never here and never in the screens.

import { createHash } from 'node:crypto';
import { getBankAccountById, listBankAccounts } from '@data/bank-account-repository';
import {
  existingLineKeys,
  insertImportBatch,
  insertStatementLine,
  latestBatchForAccount,
  streamStart,
  sumLinesUpTo,
} from '@data/statement-repository';
import { checkClosingBalance, type BalanceCheck } from '@domain/balance-check';
import type { BankAccount } from '@domain/bank-accounts';
import { lineKeys, markDuplicates, type CheckedLine } from '@domain/duplicates';
import type { ImportBatch, StatementLine } from '@domain/statement-lines';
import { readStatement, type ParsedLine, type ParsedStatement } from '@import/index';
import { compareDates, type CalendarDate } from '@shared/dates';
import { newId } from '@shared/ids';
import { addCents, negateCents, sumCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type {
  ImportBalanceView,
  ImportLineView,
  ImportPreview,
  ImportRefusal,
} from '@shared/views';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';

export interface PreviewRefusal {
  readonly reason: ImportRefusal;
  /** The last four digits of the account number in the file, when that is the reason. */
  readonly lastFour: string | null;
}

/** A previewed file with everything the commit needs. Never leaves the main process. */
export interface PreparedImport {
  readonly fileName: string;
  readonly fileHash: string;
  readonly account: BankAccount;
  readonly statement: ParsedStatement;
  readonly checked: readonly CheckedLine<ParsedLine>[];
  readonly balance: BalanceCheck;
}

const MAX_FILE_NAME = 200;

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** The part of a path after its last slash, so no folder of his is ever kept. */
function baseName(name: string): string {
  const last = name.split(/[\\/]/).at(-1) ?? '';
  return (last.trim() === '' ? 'statement' : last.trim()).slice(0, MAX_FILE_NAME);
}

/** Marks each line new or already held, by looking its key up among the account's stored lines. */
function checkAgainstBooks(
  ctx: ReadContext,
  accountId: string,
  lines: readonly ParsedLine[],
): CheckedLine<ParsedLine>[] {
  return markDuplicates(lines, existingLineKeys(ctx.db, accountId, lineKeys(lines)));
}

function refuse(reason: ImportRefusal, lastFour: string | null = null): PreviewRefusal {
  return { reason, lastFour };
}

/** Reads a file's text and works out what importing it would do. Writes nothing. */
export function previewImport(
  ctx: ReadContext,
  input: { readonly fileName: string; readonly text: string },
): Result<PreparedImport, PreviewRefusal> {
  const read = readStatement(input.text);
  if (!read.ok) return err(refuse(read.error.code));
  const statement = read.value;
  if (statement.lines.length === 0 && statement.rejected.length === 0) {
    return err(refuse('no-transactions'));
  }

  const matches = listBankAccounts(ctx.db).filter((b) => b.lastFour === statement.accountLastFour);
  const active = matches.filter((b) => b.active);
  if (matches.length === 0) return err(refuse('unknown-account', statement.accountLastFour));
  if (active.length === 0) return err(refuse('inactive-account', statement.accountLastFour));
  const [account, ...others] = active;
  if (account === undefined || others.length > 0) {
    return err(refuse('ambiguous-account', statement.accountLastFour));
  }

  const keyed = checkAgainstBooks(ctx, account.id, statement.lines);

  return ok({
    fileName: baseName(input.fileName),
    fileHash: sha256(input.text),
    account,
    statement,
    checked: keyed,
    balance: balanceOf(ctx, account, statement, keyed),
  });
}

function balanceOf(
  ctx: ReadContext,
  account: BankAccount,
  statement: ParsedStatement,
  checked: readonly CheckedLine<ParsedLine>[],
): BalanceCheck {
  const closeDate = statement.closingBalance?.date ?? statement.periodTo;
  const hasEarlierFiles = latestBatchForAccount(ctx.db, account.id) !== null;
  const stream = streamStart(ctx.db, account.id);
  // The check starts from the balance before the earliest file held. A file that starts before
  // that, or has no end day to add up to, has no figure to start from.
  const startsInside =
    stream !== null &&
    closeDate !== null &&
    statement.periodFrom !== null &&
    compareDates(statement.periodFrom, stream.from) >= 0;
  const before =
    stream !== null && closeDate !== null && startsInside
      ? addCents(stream.opening, sumLinesUpTo(ctx.db, account.id, closeDate))
      : null;
  return checkClosingBalance({
    before,
    hasEarlierFiles,
    newLines: checked
      .filter(
        (c) =>
          c.status === 'new' && (closeDate === null || compareDates(c.line.date, closeDate) <= 0),
      )
      .map((c) => c.line.amount),
    closing: statement.closingBalance?.amount ?? null,
    rejected: statement.rejected.map((r) => r.amount),
  });
}

/** What the account held before the file's first day: its closing balance less every line it lists. */
function openingBalanceOf(statement: ParsedStatement): Cents | null {
  if (statement.closingBalance === null) return null;
  const listed = sumCents([
    ...statement.lines.map((l) => l.amount),
    ...statement.rejected.flatMap((r) => (r.amount === null ? [] : [r.amount])),
  ]);
  return addCents(statement.closingBalance.amount, negateCents(listed));
}

function periodOf(statement: ParsedStatement): { from: CalendarDate; to: CalendarDate } | null {
  return statement.periodFrom === null || statement.periodTo === null
    ? null
    : { from: statement.periodFrom, to: statement.periodTo };
}

function balanceView(prepared: PreparedImport): ImportBalanceView {
  const closing = prepared.statement.closingBalance;
  const balance = prepared.balance;
  if (closing === null || balance.kind === 'no-closing-balance') {
    return { kind: 'no-closing-balance' };
  }
  switch (balance.kind) {
    case 'match':
      return { kind: 'match', closing: closing.amount, closingDate: closing.date };
    case 'difference':
      return {
        kind: 'difference',
        closing: closing.amount,
        closingDate: closing.date,
        expected: balance.expected,
        difference: balance.difference,
        explainedByRejected: balance.explainedByRejected,
      };
    case 'first-file':
    case 'no-starting-point':
      return { kind: balance.kind, closing: closing.amount, closingDate: closing.date };
  }
}

/** The preview as the screen shows it. The lines are in the file's order. */
export function importPreviewView(prepared: PreparedImport, previewId: string): ImportPreview {
  const { statement, checked, account } = prepared;
  const lines: ImportLineView[] = [
    ...checked.map((c): ImportLineView => ({
      status: c.status,
      position: c.line.position,
      date: c.line.date,
      description: c.line.description,
      amount: c.line.amount,
    })),
    ...statement.rejected.map((r): ImportLineView => ({
      status: 'rejected',
      position: r.position,
      fileLine: r.line,
      reason: r.reason,
      value: r.value,
      description: r.description,
      amount: r.amount,
    })),
  ].sort((a, b) => a.position - b.position);
  return {
    previewId,
    fileName: prepared.fileName,
    account: { id: account.id, name: account.name, lastFour: account.lastFour },
    period: periodOf(statement),
    counts: {
      new: checked.filter((c) => c.status === 'new').length,
      duplicate: checked.filter((c) => c.status === 'duplicate').length,
      rejected: statement.rejected.length,
    },
    balance: balanceView(prepared),
    lines,
  };
}

export type CommitRefusal = 'account-gone' | 'nothing-new';

export interface CommitSummary {
  readonly batch: ImportBatch;
  readonly added: number;
  readonly skipped: number;
  readonly rejected: number;
  readonly accountName: string;
}

/**
 * Saves a previewed import. The duplicates are worked out again inside the transaction, because
 * the books can have changed since the preview (an earlier import of the same file, say). The
 * batch, its lines and the audit row are written together or not at all.
 */
export function commitImport(
  ctx: ServiceContext,
  prepared: PreparedImport,
): Result<CommitSummary, CommitRefusal> {
  return ctx.db.transaction((): Result<CommitSummary, CommitRefusal> => {
    const account = getBankAccountById(ctx.db, prepared.account.id);
    if (account === null || !account.active) return err('account-gone');

    const lines = prepared.statement.lines;
    const recheck = checkAgainstBooks(ctx, account.id, lines);
    const fresh = recheck.filter((c) => c.status === 'new');
    if (fresh.length === 0) return err('nothing-new');

    const now = ctx.clock.now();
    const batchId = newId('imp', ctx.random);
    const dates = lines.map((l) => l.date).sort(compareDates);
    const first = dates[0];
    const last = dates.at(-1);
    if (first === undefined || last === undefined) return err('nothing-new');
    const closing = prepared.statement.closingBalance;
    const periodTo = prepared.statement.periodTo ?? last;
    const batch: ImportBatch = {
      id: batchId,
      bankAccountId: account.id,
      fileName: prepared.fileName,
      format: prepared.statement.format,
      fileHash: prepared.fileHash,
      periodFrom: prepared.statement.periodFrom ?? first,
      periodTo,
      newCount: fresh.length,
      duplicateCount: recheck.length - fresh.length,
      rejectedCount: prepared.statement.rejected.length,
      openingBalance: closing === null ? null : openingBalanceOf(prepared.statement),
      closingBalance:
        closing === null ? null : { amount: closing.amount, date: closing.date ?? periodTo },
      importedAt: now,
    };
    insertImportBatch(ctx.db, batch);
    for (const { line, key } of fresh) {
      const stored: StatementLine = {
        id: newId('stl', ctx.random),
        bankAccountId: account.id,
        batchId,
        date: line.date,
        description: line.description,
        amount: line.amount,
        balance: line.balance,
        key,
        status: 'to-review',
        createdAt: now,
      };
      insertStatementLine(ctx.db, stored);
    }
    recordAudit(ctx, {
      kind: 'import.commit',
      table: 'import_batch',
      rowId: batchId,
      before: null,
      after: batch,
    });
    return ok({
      batch,
      added: fresh.length,
      skipped: recheck.length - fresh.length,
      rejected: prepared.statement.rejected.length,
      accountName: account.name,
    });
  })();
}
