// Posting waiting bank lines (specs 069, 070, 072, 073 and 069a). Each line is dealt with in one
// transaction: the entry is written by the posting service (with its audit row), the line is
// marked posted and linked to it, and a `line.*` audit row records the link. If anything fails,
// nothing is saved. Several lines are posted one by one, so one bad line never blocks the rest.
//
//   account:  an entry from the line and the account (or split) he chose, GST from its code.
//   match:    the line is the bank's record of an entry already in the books. Nothing is posted;
//             the two are linked, so the movement is never counted twice.
//   transfer: money moved between two of his accounts. With the other side waiting, one entry
//             posts both and pairs them. With no other side yet, the line is posted against the
//             transfers account, and the other side pairs with it when it arrives.

import { getAccountById } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { getBankAccountById, listBankAccounts } from '@data/bank-account-repository';
import { getContactById } from '@data/contact-repository';
import { getJournalEntry } from '@data/journal-queries';
import {
  getReviewLine,
  isEntryLinked,
  listOpenTransferLines,
  listWaitingLines,
  markLinePosted,
  setPairedLine,
  type ReviewLine,
} from '@data/review-repository';
import { getRule } from '@data/rule-repository';
import { getTaxCodeById } from '@data/tax-code-repository';
import { findEntryMatch } from '@domain/entry-match';
import type { EntryInput, EntryProblem } from '@domain/journal';
import { lineToEntry, type LinePart } from '@domain/line-to-entry';
import { ruleFits, shareByPercent } from '@domain/rules';
import type { SimpleEntryTax } from '@domain/simple-entry';
import { findTransferMatch } from '@domain/transfer-match';
import type { Id } from '@shared/ids';
import { asCents, negateCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import type { PostFailure, PostOutcome, ReviewAction } from '@shared/views';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';
import { postEntry, type PostError } from './post-journal';

/** One share of a split line, as he typed it. */
export interface SplitPart {
  readonly accountId: string;
  readonly taxCodeId: string | null;
  /** Positive, with any GST in it. */
  readonly amount: Cents;
}

interface Posted {
  readonly entryId: string;
  /** The other side of a transfer, when one entry posted both. */
  readonly alsoPosted: string | null;
}

function failureFor(error: PostError): PostFailure {
  if (error.code === 'business-not-set-up') return 'not-set-up';
  const codes = new Set(error.problems.map((p: EntryProblem) => p.code));
  if (codes.has('locked-period')) return 'locked';
  if (codes.has('inactive-account')) return 'inactive-account';
  return 'invalid';
}

/** The line, if it is still waiting. */
function waitingLine(ctx: ServiceContext, lineId: string): Result<ReviewLine, PostFailure> {
  const line = getReviewLine(ctx.db, lineId);
  if (line === null) return err('not-found');
  if (line.status !== 'to-review') return err('not-waiting');
  return ok(line);
}

/** Posts the entry and links the line to it, with the line's own audit row. */
function postAndLink(
  ctx: ServiceContext,
  line: ReviewLine,
  entry: EntryInput,
  pairedLineId: string | null,
): Result<Posted, PostFailure> {
  const posted = postEntry(ctx, entry);
  if (!posted.ok) return err(failureFor(posted.error));
  markLinePosted(ctx.db, line.id, posted.value.id, pairedLineId);
  recordAudit(ctx, {
    kind: 'line.post',
    table: 'statement_line',
    rowId: line.id,
    before: { status: 'to-review' },
    after: { status: 'posted', entryId: posted.value.id, pairedLineId },
  });
  return ok({ entryId: posted.value.id, alsoPosted: null });
}

/** A tax code as the entry builder needs it, or the account's own default when none is given. */
function taxFor(
  ctx: ServiceContext,
  accountId: string,
  taxCodeId: string | null,
): Result<SimpleEntryTax | null, PostFailure> {
  const account = getAccountById(ctx.db, accountId);
  if (account === null) return err('invalid');
  const id = taxCodeId ?? account.defaultTaxCodeId;
  if (id === null) return ok(null);
  const code = getTaxCodeById(ctx.db, id);
  if (code === null) return err('invalid');
  return ok({ taxCodeId: code.id, treatment: code.treatment, rateBp: code.rateBp });
}

/** His bank accounts and the transfers account are reached by Transfer, never as a category. */
function isTransferOnlyAccount(ctx: ServiceContext, accountId: string): boolean {
  if (accountForRole(ctx.db, 'transfers') === accountId) return true;
  return listBankAccounts(ctx.db).some((b) => b.ledgerAccountId === accountId);
}

function postParts(
  ctx: ServiceContext,
  lineId: string,
  parts: readonly SplitPart[],
  payeeId: string | null,
): Result<Posted, PostFailure> {
  return ctx.db.transaction((): Result<Posted, PostFailure> => {
    const line = waitingLine(ctx, lineId);
    if (!line.ok) return line;
    const gstAccountId = accountForRole(ctx.db, 'gst');
    if (gstAccountId === null) return err('not-set-up');
    if (payeeId !== null && getContactById(ctx.db, payeeId) === null) return err('invalid');

    const built: LinePart[] = [];
    for (const part of parts) {
      if (isTransferOnlyAccount(ctx, part.accountId)) return err('use-transfer');
      const tax = taxFor(ctx, part.accountId, part.taxCodeId);
      if (!tax.ok) return tax;
      built.push({ accountId: part.accountId as Id<'acc'>, tax: tax.value, gross: part.amount });
    }
    const entry = lineToEntry({
      line: line.value,
      bankLedgerAccountId: line.value.bankLedgerAccountId,
      parts: built,
      payeeId,
      gstAccountId,
    });
    if (!entry.ok) return err('invalid');
    return postAndLink(ctx, line.value, entry.value, null);
  })();
}

/** Posts a line to one account. A null tax code means the account's usual one. */
export function postLineToAccount(
  ctx: ServiceContext,
  input: {
    readonly lineId: string;
    readonly accountId: string;
    readonly taxCodeId: string | null;
    readonly payeeId: string | null;
  },
): Result<Posted, PostFailure> {
  const line = getReviewLine(ctx.db, input.lineId);
  if (line === null) return err('not-found');
  return postParts(
    ctx,
    input.lineId,
    [
      {
        accountId: input.accountId,
        taxCodeId: input.taxCodeId,
        amount: asCents(Math.abs(line.amount)),
      },
    ],
    input.payeeId,
  );
}

/** Posts a line shared across several accounts. The parts must add up to the line exactly. */
export function postSplitLine(
  ctx: ServiceContext,
  input: {
    readonly lineId: string;
    readonly parts: readonly SplitPart[];
    readonly payeeId: string | null;
  },
): Result<Posted, PostFailure> {
  return postParts(ctx, input.lineId, input.parts, input.payeeId);
}

/** Links the line with an entry already in the books, if it still fits. Posts nothing. */
export function matchLine(
  ctx: ServiceContext,
  input: { readonly lineId: string; readonly entryId: string },
): Result<Posted, PostFailure> {
  return ctx.db.transaction((): Result<Posted, PostFailure> => {
    const line = waitingLine(ctx, input.lineId);
    if (!line.ok) return line;
    const entry = getJournalEntry(ctx.db, input.entryId);
    if (entry === null || isEntryLinked(ctx.db, entry.id)) return err('no-longer-matches');
    const bankAmount = asCents(
      entry.lines
        .filter((l) => l.accountId === line.value.bankLedgerAccountId)
        .reduce((sum, l) => sum + l.amount, 0),
    );
    const fits = findEntryMatch(line.value, [{ id: entry.id, date: entry.date, bankAmount }]);
    if (fits === null) return err('no-longer-matches');

    markLinePosted(ctx.db, line.value.id, entry.id, null);
    recordAudit(ctx, {
      kind: 'line.match',
      table: 'statement_line',
      rowId: line.value.id,
      before: { status: 'to-review' },
      after: { status: 'posted', entryId: entry.id },
    });
    return ok({ entryId: entry.id, alsoPosted: null });
  })();
}

function transferEntry(line: ReviewLine, otherAccountId: Id<'acc'>): EntryInput {
  const mine = {
    accountId: line.bankLedgerAccountId,
    amount: line.amount,
    taxCodeId: null,
    gst: asCents(0),
    payeeId: null,
    memo: '',
  };
  const theirs = { ...mine, accountId: otherAccountId, amount: negateCents(line.amount) };
  return {
    date: line.date,
    memo: line.description,
    sourceKind: 'bank-line',
    sourceId: line.id,
    lines: line.amount > 0 ? [mine, theirs] : [theirs, mine],
  };
}

/** Posts a line as money moved to or from another of his bank accounts. */
export function postTransfer(
  ctx: ServiceContext,
  input: { readonly lineId: string; readonly otherBankAccountId: string },
): Result<Posted, PostFailure> {
  return ctx.db.transaction((): Result<Posted, PostFailure> => {
    const line = waitingLine(ctx, input.lineId);
    if (!line.ok) return line;
    const other = getBankAccountById(ctx.db, input.otherBankAccountId);
    if (other === null || other.id === line.value.bankAccountId) return err('invalid');
    const clearing = accountForRole(ctx.db, 'transfers');
    if (clearing === null) return err('not-set-up');

    // The other side is waiting too: one entry posts both, and they are paired.
    const waiting = listWaitingLines(ctx.db).filter((l) => l.bankAccountId === other.id);
    const pair = findTransferMatch(line.value, waiting);
    if (pair !== null) {
      const posted = postAndLink(
        ctx,
        line.value,
        transferEntry(line.value, other.ledgerAccountId),
        pair.id,
      );
      if (!posted.ok) return posted;
      markLinePosted(ctx.db, pair.id, posted.value.entryId, line.value.id);
      recordAudit(ctx, {
        kind: 'line.post',
        table: 'statement_line',
        rowId: pair.id,
        before: { status: 'to-review' },
        after: { status: 'posted', entryId: posted.value.entryId, pairedLineId: line.value.id },
      });
      return ok({ entryId: posted.value.entryId, alsoPosted: pair.id });
    }

    // The other side was posted first, against the transfers account: this side clears it.
    const open = listOpenTransferLines(ctx.db, clearing).filter(
      (l) => l.bankAccountId === other.id,
    );
    const earlier = findTransferMatch(line.value, open);
    const posted = postAndLink(
      ctx,
      line.value,
      transferEntry(line.value, clearing),
      earlier?.id ?? null,
    );
    if (!posted.ok) return posted;
    if (earlier !== null) setPairedLine(ctx.db, earlier.id, line.value.id);
    return posted;
  })();
}

/**
 * Posts a line the way a rule says (specs 079, 081): its account and GST code, or its split shared
 * by percentage, and its payee unless he typed another. The rule must still fit the line.
 */
export function applyRule(
  ctx: ServiceContext,
  input: { readonly lineId: string; readonly ruleId: string; readonly payeeId: string | null },
): Result<Posted, PostFailure> {
  const line = getReviewLine(ctx.db, input.lineId);
  if (line === null) return err('not-found');
  const rule = getRule(ctx.db, input.ruleId);
  if (rule === null || !rule.active || !ruleFits(rule, line)) return err('no-longer-matches');
  const gross = asCents(Math.abs(line.amount));
  const parts: SplitPart[] =
    rule.target.kind === 'account'
      ? [{ accountId: rule.target.accountId, taxCodeId: rule.target.taxCodeId, amount: gross }]
      : shareByPercent(gross, rule.target.parts)
          .map((amount, i) => ({
            accountId: rule.target.kind === 'split' ? (rule.target.parts[i]?.accountId ?? '') : '',
            taxCodeId:
              rule.target.kind === 'split' ? (rule.target.parts[i]?.taxCodeId ?? null) : null,
            amount,
          }))
          // A share of a very small line can round to nothing, and a part of nothing is not posted.
          .filter((p) => p.amount > 0);
  return postParts(ctx, line.id, parts, input.payeeId ?? rule.payeeId);
}

/** Does one action. Returns what was posted, or why not. */
function runAction(ctx: ServiceContext, action: ReviewAction): Result<Posted, PostFailure> {
  switch (action.kind) {
    case 'account':
      if (action.accountId === null) return err('needs-account');
      return postLineToAccount(ctx, {
        lineId: action.lineId,
        accountId: action.accountId,
        taxCodeId: action.taxCodeId,
        payeeId: action.payeeId,
      });
    case 'match':
      return matchLine(ctx, { lineId: action.lineId, entryId: action.entryId });
    case 'transfer':
      return postTransfer(ctx, {
        lineId: action.lineId,
        otherBankAccountId: action.otherBankAccountId,
      });
    case 'rule':
      return applyRule(ctx, {
        lineId: action.lineId,
        ruleId: action.ruleId,
        payeeId: action.payeeId,
      });
  }
}

/**
 * Posts each line in its own transaction, in the order given (spec 070). A line that fails is
 * reported with the reason and the rest go ahead. A line already posted as the other side of an
 * earlier transfer in the same batch is skipped quietly.
 */
export function postLines(ctx: ServiceContext, actions: readonly ReviewAction[]): PostOutcome {
  const posted: string[] = [];
  const alsoPosted: string[] = [];
  const failed: { lineId: string; reason: PostFailure }[] = [];
  for (const action of actions) {
    if (alsoPosted.includes(action.lineId)) continue;
    const result = runAction(ctx, action);
    if (result.ok) {
      posted.push(action.lineId);
      if (result.value.alsoPosted !== null) alsoPosted.push(result.value.alsoPosted);
    } else {
      failed.push({ lineId: action.lineId, reason: result.error });
    }
  }
  return { posted, alsoPosted, failed };
}
