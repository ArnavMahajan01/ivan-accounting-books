// Bank rules (specs 078 to 082): saving, ordering and testing them, posting by them on import, and
// the offer to make one from a line he posted. Every change to a rule has an audit row. Posting by
// a rule goes through post-line.ts, so it passes the same checks as posting by hand.

import { accountForRole } from '@data/account-role-repository';
import { getAccountById, listAccounts } from '@data/account-repository';
import { getBankAccountById, listBankAccounts } from '@data/bank-account-repository';
import { getContactById, listContacts } from '@data/contact-repository';
import { getJournalEntry } from '@data/journal-queries';
import {
  getReviewLine,
  listAllLines,
  listPostedLineHistory,
  listWaitingLines,
} from '@data/review-repository';
import { deleteRule, getRule, insertRule, listRules, updateRule } from '@data/rule-repository';
import { getTaxCodeById, listTaxCodes } from '@data/tax-code-repository';
import { descriptionWords } from '@domain/payees';
import { firstFittingRule, ruleFits, ruleProblems, type RuleProblem } from '@domain/rules';
import { newId } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import type { Rule, RuleInput } from '@shared/rule-types';
import type { RulesView } from '@shared/bridge-contract';
import type { PostFailure, RuleTestResult } from '@shared/views';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';
import { entryMatchesFor } from './line-matches';
import { applyRule } from './post-line';

export type RuleSaveError =
  | RuleProblem
  | 'not-found'
  | 'unknown-account'
  | 'bank-account-chosen'
  | 'unknown-tax-code'
  | 'unknown-payee'
  | 'unknown-bank-account';

/** The accounts, codes and contacts a rule names must exist, and a category is never a bank account. */
function referenceProblem(ctx: ReadContext, rule: RuleInput): RuleSaveError | null {
  const transfers = accountForRole(ctx.db, 'transfers');
  const bankLedger = new Set(listBankAccounts(ctx.db).map((b) => b.ledgerAccountId));
  const targets =
    rule.target.kind === 'account'
      ? [{ accountId: rule.target.accountId, taxCodeId: rule.target.taxCodeId }]
      : rule.target.parts;
  for (const t of targets) {
    const account = getAccountById(ctx.db, t.accountId);
    if (account === null || !account.active) return 'unknown-account';
    if (bankLedger.has(account.id) || account.id === transfers) return 'bank-account-chosen';
    if (t.taxCodeId !== null && getTaxCodeById(ctx.db, t.taxCodeId) === null) {
      return 'unknown-tax-code';
    }
  }
  if (rule.payeeId !== null && getContactById(ctx.db, rule.payeeId) === null)
    return 'unknown-payee';
  if (rule.bankAccountIds.some((id) => getBankAccountById(ctx.db, id) === null)) {
    return 'unknown-bank-account';
  }
  return null;
}

function cleaned(rule: RuleInput): RuleInput {
  return {
    ...rule,
    name: rule.name.trim(),
    bankAccountIds: [...new Set(rule.bankAccountIds)],
    conditions: rule.conditions.map((c) =>
      c.field === 'description' ? { ...c, text: c.text.trim().replace(/\s+/g, ' ') } : c,
    ),
  };
}

/** Saves a new rule, last in the order, or changes an existing one in place. */
export function saveRule(
  ctx: ServiceContext,
  input: { readonly id: string | null; readonly rule: RuleInput },
): Result<Rule, RuleSaveError> {
  const rule = cleaned(input.rule);
  const problem = ruleProblems(rule)[0];
  if (problem !== undefined) return err(problem);
  return ctx.db.transaction((): Result<Rule, RuleSaveError> => {
    const reference = referenceProblem(ctx, rule);
    if (reference !== null) return err(reference);
    const now = ctx.clock.now();
    if (input.id === null) {
      const saved: Rule = {
        ...rule,
        id: newId('rul', ctx.random),
        position: listRules(ctx.db).length,
        active: true,
      };
      insertRule(ctx.db, saved, now);
      recordAudit(ctx, {
        kind: 'rule.add',
        table: 'rule',
        rowId: saved.id,
        before: null,
        after: saved,
      });
      return ok(saved);
    }
    const existing = getRule(ctx.db, input.id);
    if (existing === null) return err('not-found');
    const saved: Rule = { ...existing, ...rule };
    updateRule(ctx.db, saved, now);
    recordAudit(ctx, {
      kind: 'rule.change',
      table: 'rule',
      rowId: saved.id,
      before: existing,
      after: saved,
    });
    return ok(saved);
  })();
}

export function setRuleActive(
  ctx: ServiceContext,
  id: string,
  active: boolean,
): Result<Rule, 'not-found'> {
  return ctx.db.transaction((): Result<Rule, 'not-found'> => {
    const existing = getRule(ctx.db, id);
    if (existing === null) return err('not-found');
    const saved = { ...existing, active };
    updateRule(ctx.db, saved, ctx.clock.now());
    recordAudit(ctx, {
      kind: 'rule.change',
      table: 'rule',
      rowId: id,
      before: existing,
      after: saved,
    });
    return ok(saved);
  })();
}

/** Moves a rule to a new place in the order (0 is first). The others close up around it. */
export function moveRule(
  ctx: ServiceContext,
  id: string,
  toPosition: number,
): Result<readonly Rule[], 'not-found'> {
  return ctx.db.transaction((): Result<readonly Rule[], 'not-found'> => {
    const rules = listRules(ctx.db);
    const moving = rules.find((r) => r.id === id);
    if (moving === undefined) return err('not-found');
    const others = rules.filter((r) => r.id !== id);
    const place = Math.max(0, Math.min(others.length, toPosition));
    const ordered = [...others.slice(0, place), moving, ...others.slice(place)];
    const now = ctx.clock.now();
    const saved = ordered.map((r, position) => ({ ...r, position }));
    for (const r of saved) updateRule(ctx.db, r, now);
    recordAudit(ctx, {
      kind: 'rule.reorder',
      table: 'rule',
      rowId: id,
      before: rules.map((r) => r.id),
      after: saved.map((r) => r.id),
    });
    return ok(saved);
  })();
}

export function removeRule(ctx: ServiceContext, id: string): Result<void, 'not-found'> {
  return ctx.db.transaction((): Result<void, 'not-found'> => {
    const existing = getRule(ctx.db, id);
    if (existing === null) return err('not-found');
    deleteRule(ctx.db, id);
    listRules(ctx.db).forEach((r, position) => {
      if (r.position !== position) updateRule(ctx.db, { ...r, position }, ctx.clock.now());
    });
    recordAudit(ctx, {
      kind: 'rule.remove',
      table: 'rule',
      rowId: id,
      before: existing,
      after: null,
    });
    return ok(undefined);
  })();
}

/** How many waiting and posted lines a rule would fit, before it is saved (spec 080). */
export function testRule(ctx: ReadContext, rule: RuleInput, sampleSize = 20): RuleTestResult {
  const fitting = listAllLines(ctx.db).filter(
    (l) => l.status !== 'excluded' && ruleFits(cleaned(rule), l),
  );
  return {
    waiting: fitting.filter((l) => l.status === 'to-review').length,
    posted: fitting.filter((l) => l.status === 'posted').length,
    lines: fitting.slice(0, sampleSize).map((l) => ({
      id: l.id,
      date: l.date,
      description: l.description,
      amount: l.amount,
      status: l.status === 'to-review' ? 'to-review' : 'posted',
    })),
  };
}

export interface RulesPosted {
  readonly posted: readonly string[];
  readonly skipped: readonly { readonly lineId: string; readonly reason: PostFailure }[];
}

/**
 * After an import (spec 081): every new line that a "post by itself" rule fits is posted by that
 * rule, each in its own transaction. A line that is already in the books (a match) is left for him.
 * A line the rule cannot post (a locked period, an inactive account) stays waiting and is reported.
 */
export function postByRules(ctx: ServiceContext, batchId: string): RulesPosted {
  const rules = listRules(ctx.db).filter((r) => r.active);
  if (!rules.some((r) => r.autoPost)) return { posted: [], skipped: [] };
  const waiting = listWaitingLines(ctx.db);
  const matched = entryMatchesFor(ctx, waiting);
  const posted: string[] = [];
  const skipped: { lineId: string; reason: PostFailure }[] = [];
  for (const line of waiting) {
    if (line.batchId !== batchId || matched.has(line.id)) continue;
    const rule = firstFittingRule(rules, line);
    if (rule === null || !rule.autoPost) continue;
    const result = applyRule(ctx, { lineId: line.id, ruleId: rule.id, payeeId: null });
    if (result.ok) posted.push(line.id);
    else skipped.push({ lineId: line.id, reason: result.error });
  }
  return { posted, skipped };
}

/** How often the same words must have gone to the same account before a rule is offered. */
export const OFFER_AFTER = 2;

/**
 * "Do this every time?" (spec 082): after he posts a line with an account, a rule filled in from
 * it, when no rule fits it and lines with the same words have gone to the same account at least
 * twice. Null otherwise.
 */
export function ruleOfferFor(
  ctx: ReadContext,
  lineId: string,
): { readonly words: string; readonly rule: RuleInput } | null {
  const line = getReviewLine(ctx.db, lineId);
  if (line === null || line.status !== 'posted' || line.entryId === null) return null;
  const entry = getJournalEntry(ctx.db, line.entryId);
  if (entry?.sourceId !== line.id) return null;
  if (firstFittingRule(listRules(ctx.db), line) !== null) return null;

  const gst = accountForRole(ctx.db, 'gst');
  const category = entry.lines.filter(
    (l) => l.accountId !== line.bankLedgerAccountId && l.accountId !== gst,
  );
  const only = category[0];
  if (category.length !== 1 || only === undefined) return null;

  const words = descriptionWords(line.description);
  if (words === '') return null;
  const out = line.amount < 0;
  const alike = listPostedLineHistory(ctx.db, gst).filter(
    (h) =>
      descriptionWords(h.description) === words &&
      h.accountId === only.accountId &&
      h.amount < 0 === out,
  );
  if (alike.length < OFFER_AFTER) return null;

  // The first word names the place when it is long enough; otherwise all the words do.
  const first = words.split(' ')[0] ?? words;
  const key = first.length >= 4 ? first : words;
  const name = key.charAt(0) + key.slice(1).toLowerCase();
  return {
    words: key,
    rule: {
      name,
      direction: out ? 'out' : 'in',
      bankAccountIds: [],
      matchMode: 'all',
      conditions: [{ field: 'description', op: 'contains', text: key }],
      target: { kind: 'account', accountId: only.accountId, taxCodeId: only.taxCodeId },
      payeeId: only.payeeId,
      autoPost: false,
    },
  };
}

/** The Rules page (spec 079): every rule in order, and the choices for its editor. */
export function getRulesView(ctx: ReadContext): RulesView {
  const transfers = accountForRole(ctx.db, 'transfers');
  const banks = listBankAccounts(ctx.db);
  const bankLedger = new Set(banks.map((b) => b.ledgerAccountId));
  return {
    rules: listRules(ctx.db),
    accounts: listAccounts(ctx.db)
      .filter((a) => a.active && !bankLedger.has(a.id) && a.id !== transfers)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        defaultTaxCodeId: a.defaultTaxCodeId,
      })),
    taxCodes: listTaxCodes(ctx.db)
      .filter((t) => t.active)
      .map((t) => ({ id: t.id, shortCode: t.shortCode, name: t.name })),
    contacts: listContacts(ctx.db)
      .filter((c) => c.active)
      .map((c) => ({ id: c.id, name: c.name })),
    bankAccounts: banks.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name })),
  };
}
