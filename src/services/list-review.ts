// What the To review page shows (spec 068): the waiting lines, each with what the app has for it,
// the filters' counts, and the choices for the account, GST and From/To boxes.
//
// For each line, in this order of strength:
//   match:      an entry already in the books for the same amount through the same account (069a);
//   transfer:   the other side of a move between two of his accounts (073);
//   suggestion: an account from how similar lines were posted before (074).
// From/To comes from the words saved for a contact (071), or else from the suggestion.

import { listAccounts } from '@data/account-repository';
import { accountForRole } from '@data/account-role-repository';
import { listBankAccounts } from '@data/bank-account-repository';
import { listContacts } from '@data/contact-repository';
import {
  listContactMatches,
  listOpenTransferLines,
  listPostedLineHistory,
  listWaitingLines,
  type ReviewLine,
} from '@data/review-repository';
import { listRules } from '@data/rule-repository';
import { listTaxCodes } from '@data/tax-code-repository';
import { firstFittingRule } from '@domain/rules';
import { contactForWords, descriptionWords } from '@domain/payees';
import { suggestFor, type PastPosting } from '@domain/suggest';
import { findTransferMatch } from '@domain/transfer-match';
import { parseCents } from '@shared/money';
import {
  REVIEW_PAGE_LIMIT,
  type ReviewLineView,
  type ReviewShow,
  type ReviewView,
} from '@shared/views';
import type { Rule } from '@shared/rule-types';
import type { ReadContext } from './context';
import { entryMatchesFor } from './line-matches';

/** What a rule gives a line, as a suggestion: its account (the first, for a split) and GST code. */
function ruleSuggestion(rule: Rule) {
  const first =
    rule.target.kind === 'account'
      ? rule.target
      : {
          accountId: rule.target.parts[0]?.accountId ?? '',
          taxCodeId: rule.target.parts[0]?.taxCodeId ?? null,
        };
  return {
    accountId: first.accountId,
    taxCodeId: first.taxCodeId,
    payeeId: rule.payeeId,
    reason: 'from-your-rule' as const,
  };
}

export interface ReviewFilters {
  readonly bankAccountId?: string | undefined;
  readonly show?: ReviewShow | undefined;
  readonly search?: string | undefined;
}

const direction = (amount: number): 'in' | 'out' => (amount > 0 ? 'in' : 'out');

/** Whether the line's description, or its amount as typed (`412.60`, `$1,284.70`), fits the search. */
function fitsSearch(line: ReviewLine, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (text === '') return true;
  if (line.description.toLowerCase().includes(text)) return true;
  const amount = parseCents(text.replace(/^-?\$?/, '').replace(/,/g, ''));
  return amount.ok && amount.value === Math.abs(line.amount);
}

export function getReviewView(ctx: ReadContext, filters: ReviewFilters = {}): ReviewView {
  const { db } = ctx;
  const waiting = listWaitingLines(db);
  const bankAccounts = listBankAccounts(db);
  const bankName = new Map(bankAccounts.map((b) => [b.id, b.name]));
  const contacts = listContacts(db).filter((c) => c.active);
  const contactName = new Map<string, string>(contacts.map((c) => [c.id, c.name]));
  const contactMatches = listContactMatches(db);
  const gstAccount = accountForRole(db, 'gst');
  const transfersAccount = accountForRole(db, 'transfers');

  const history: PastPosting[] = listPostedLineHistory(db, gstAccount).map((h) => ({
    words: descriptionWords(h.description),
    direction: direction(h.amount),
    accountId: h.accountId,
    taxCodeId: h.taxCodeId,
    payeeId: h.payeeId,
    date: h.date,
  }));

  const matches = entryMatchesFor(ctx, waiting);
  const rules = listRules(db);
  const accountNames = new Map<string, string>(listAccounts(db).map((a) => [a.id, a.name]));
  const openTransfers =
    transfersAccount === null ? [] : listOpenTransferLines(db, transfersAccount);

  const views: ReviewLineView[] = waiting.map((line) => {
    const words = descriptionWords(line.description);
    const entry = matches.get(line.id) ?? null;

    const otherSide =
      entry === null
        ? (findTransferMatch(line, waiting) ?? findTransferMatch(line, openTransfers))
        : null;
    // A rule he made comes before a guess from past lines (spec 079).
    const rule = entry === null && otherSide === null ? firstFittingRule(rules, line) : null;
    const suggestion =
      rule !== null
        ? ruleSuggestion(rule)
        : entry === null && otherSide === null
          ? suggestFor({ words, direction: direction(line.amount) }, history)
          : null;
    const savedContact = contactForWords(words, contactMatches)?.contactId ?? null;
    const payeeId = savedContact ?? suggestion?.payeeId ?? null;
    const payeeName = payeeId === null ? undefined : contactName.get(payeeId);

    return {
      id: line.id,
      date: line.date,
      description: line.description,
      amount: line.amount,
      bankAccountId: line.bankAccountId,
      bankAccountName: line.bankAccountName,
      payee:
        payeeId === null || payeeName === undefined
          ? null
          : { contactId: payeeId, name: payeeName },
      suggestion:
        suggestion === null
          ? null
          : {
              accountId: suggestion.accountId,
              taxCodeId: suggestion.taxCodeId,
              reason: suggestion.reason,
              rule:
                rule === null
                  ? null
                  : {
                      id: rule.id,
                      name: rule.name,
                      split:
                        rule.target.kind === 'split'
                          ? rule.target.parts.map((p) => ({
                              accountName: accountNames.get(p.accountId) ?? '',
                              percentBp: p.percentBp,
                            }))
                          : null,
                    },
            },
      match:
        entry === null
          ? null
          : { entryId: entry.id, date: entry.date, text: entry.payeeName ?? entry.memo },
      transfer:
        otherSide === null
          ? null
          : {
              lineId: otherSide.id,
              bankAccountId: otherSide.bankAccountId,
              bankAccountName: bankName.get(otherSide.bankAccountId) ?? '',
              date: otherSide.date,
              alreadyPosted: otherSide.status === 'posted',
            },
    };
  });

  const inScope = views.filter(
    (v, i) =>
      (filters.bankAccountId === undefined || v.bankAccountId === filters.bankAccountId) &&
      fitsSearch(waiting[i] as ReviewLine, filters.search ?? ''),
  );
  const hasSomething = (v: ReviewLineView) =>
    v.match !== null || v.transfer !== null || v.suggestion !== null;
  const shown = inScope.filter((v) =>
    filters.show === 'suggested'
      ? hasSomething(v)
      : filters.show === 'no-suggestion'
        ? !hasSomething(v)
        : true,
  );

  const bankLedger = new Set(bankAccounts.map((b) => b.ledgerAccountId));
  return {
    lines: shown.slice(0, REVIEW_PAGE_LIMIT),
    counts: {
      all: inScope.length,
      suggested: inScope.filter(hasSomething).length,
      noSuggestion: inScope.filter((v) => !hasSomething(v)).length,
    },
    waiting: waiting.length,
    bankAccounts: bankAccounts.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name })),
    accounts: listAccounts(db)
      .filter((a) => a.active && !bankLedger.has(a.id) && a.id !== transfersAccount)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        defaultTaxCodeId: a.defaultTaxCodeId,
      })),
    taxCodes: listTaxCodes(db)
      .filter((t) => t.active)
      .map((t) => ({ id: t.id, shortCode: t.shortCode, name: t.name })),
    contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
  };
}
