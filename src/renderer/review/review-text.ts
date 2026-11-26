// The To review page's plain logic: what each row will do when posted, finding an account from
// what he typed, and the words the page uses. Kept out of the components so it can be tested alone.

import type {
  PostFailure,
  PostOutcome,
  ReviewAccountChoice,
  ReviewAction,
  ReviewLineView,
  ReviewView,
  SavePayeeOutcome,
  SuggestionReason,
} from '@shared/views';
import { negateCents, type Cents } from '@shared/money';
import { plural } from '../import/import-text';

/** What he has typed or chosen on a row, before posting it. */
export interface RowDraft {
  /** `auto` follows the match or transfer the app found. `account` is his own choice of account. */
  readonly mode: 'auto' | 'account';
  readonly accountText: string;
  readonly taxCodeId: string | null;
  readonly payeeText: string;
}

/** How an account is shown and typed: `5000 Materials and supplies`. */
export function accountLabel(account: Pick<ReviewAccountChoice, 'code' | 'name'>): string {
  return `${account.code} ${account.name}`;
}

/**
 * The account he means: the label as the list shows it, a code, or a name or the start of one
 * that fits only one account. Capitals do not matter. Null when it fits none, or several.
 */
export function findAccount(
  text: string,
  accounts: readonly ReviewAccountChoice[],
): ReviewAccountChoice | null {
  const typed = text.trim().toLowerCase();
  if (typed === '') return null;
  const exact = accounts.find(
    (a) =>
      accountLabel(a).toLowerCase() === typed ||
      a.code.toLowerCase() === typed ||
      a.name.toLowerCase() === typed,
  );
  if (exact !== undefined) return exact;
  const starting = accounts.filter(
    (a) =>
      a.name.toLowerCase().startsWith(typed) || accountLabel(a).toLowerCase().startsWith(typed),
  );
  return starting.length === 1 ? (starting[0] ?? null) : null;
}

/** The row as it starts: the suggestion's account and GST code, and the payee the app has. */
export function initialDraft(line: ReviewLineView, view: Pick<ReviewView, 'accounts'>): RowDraft {
  const suggested = view.accounts.find((a) => a.id === line.suggestion?.accountId);
  return {
    mode: 'auto',
    accountText: suggested === undefined ? '' : accountLabel(suggested),
    taxCodeId: line.suggestion?.taxCodeId ?? suggested?.defaultTaxCodeId ?? null,
    payeeText: line.payee?.name ?? '',
  };
}

/** Whether the row follows a match or a transfer the app found, rather than an account. */
export function followsFound(line: ReviewLineView, draft: RowDraft): 'match' | 'transfer' | null {
  if (draft.mode !== 'auto') return null;
  if (line.match !== null) return 'match';
  if (line.transfer !== null) return 'transfer';
  return null;
}

/** The contact the From/To box names: the line's own, or a saved contact of that name. */
export function payeeIdFor(
  line: ReviewLineView,
  draft: RowDraft,
  contacts: ReviewView['contacts'],
): string | null {
  const typed = draft.payeeText.trim().toLowerCase();
  if (typed === '') return null;
  if (line.payee !== null && line.payee.name.toLowerCase() === typed) return line.payee.contactId;
  return contacts.find((c) => c.name.toLowerCase() === typed)?.id ?? null;
}

/** What posting the row does. */
export function actionFor(line: ReviewLineView, draft: RowDraft, view: ReviewView): ReviewAction {
  const found = followsFound(line, draft);
  if (found === 'match' && line.match !== null) {
    return { kind: 'match', lineId: line.id, entryId: line.match.entryId };
  }
  if (found === 'transfer' && line.transfer !== null) {
    return { kind: 'transfer', lineId: line.id, otherBankAccountId: line.transfer.bankAccountId };
  }
  // Untouched, a line a rule fits is posted the way the rule says, split and all.
  if (draft.mode === 'auto' && line.suggestion?.rule != null) {
    return {
      kind: 'rule',
      lineId: line.id,
      ruleId: line.suggestion.rule.id,
      payeeId: payeeIdFor(line, draft, view.contacts),
    };
  }
  return {
    kind: 'account',
    lineId: line.id,
    accountId: findAccount(draft.accountText, view.accounts)?.id ?? null,
    taxCodeId: draft.taxCodeId,
    payeeId: payeeIdFor(line, draft, view.contacts),
  };
}

/** A split rule's parts in words: "70% Telephone and internet, 30% Owner drawings". */
export function splitRuleText(
  split: readonly { readonly accountName: string; readonly percentBp: number }[],
): string {
  return split.map((p) => `${String(p.percentBp / 100)}% ${p.accountName}`).join(', ');
}

/** Whether the app has something for the line: a match, a transfer or a suggestion. */
export function hasSuggestion(line: ReviewLineView): boolean {
  return line.match !== null || line.transfer !== null || line.suggestion !== null;
}

export const REASON_TEXT: Record<SuggestionReason, string> = {
  'from-your-rule': 'from your rule',
  'same-as-last-time': 'same as last time',
  'best-guess': 'best guess',
};

/** Each failure as a whole phrase with its count: "1 needs an account", "2 need an account". */
const FAILURE_TEXT: Record<PostFailure, (n: number) => string> = {
  'needs-account': (n) => `${plural(n, 'needs', 'need')} an account`,
  'not-found': (n) => `${plural(n, 'line was', 'lines were')} no longer there`,
  'not-waiting': (n) => `${plural(n, 'line was', 'lines were')} already posted`,
  locked: (n) => `${plural(n, 'is', 'are')} in a locked period`,
  'inactive-account': (n) => `${plural(n, 'uses', 'use')} an account that is no longer used`,
  'use-transfer': (n) => `${plural(n, 'is', 'are')} for one of your bank accounts: use Transfer`,
  'no-longer-matches': (n) => `${plural(n, 'no longer matches', 'no longer match')} that entry`,
  'not-set-up': (n) => `${plural(n, 'line waits', 'lines wait')} for the books to be set up`,
  invalid: (n) => `${plural(n, 'line', 'lines')} could not be posted`,
};

/** "12 posted. 1 needs an account." */
export function outcomeText(outcome: PostOutcome): string {
  const done = outcome.posted.length + outcome.alsoPosted.length;
  const parts: string[] = [];
  if (done > 0) parts.push(`${done.toLocaleString('en-AU')} posted.`);
  const byReason = new Map<PostFailure, number>();
  for (const f of outcome.failed) byReason.set(f.reason, (byReason.get(f.reason) ?? 0) + 1);
  for (const [reason, count] of byReason) parts.push(`${FAILURE_TEXT[reason](count)}.`);
  return parts.join(' ');
}

/** What the page says after a From/To is saved. */
export function payeeSavedText(saved: Extract<SavePayeeOutcome, { kind: 'saved' }>): string {
  const kind =
    saved.kindOfContact === 'both'
      ? 'customer and supplier'
      : saved.kindOfContact === 'customer'
        ? 'customer'
        : 'supplier';
  const first = saved.created
    ? `Saved ${saved.name} as a ${kind}.`
    : `${saved.name} will fill in for lines like this.`;
  if (saved.alsoFilled === 0) return first;
  return `${first} ${plural(saved.alsoFilled, 'more line now shows', 'more lines now show')} it.`;
}

/** Spent is money out and Received is money in, both shown without a sign. */
export function spentAndReceived(amount: Cents): { spent: Cents | null; received: Cents | null } {
  return amount < 0
    ? { spent: negateCents(amount), received: null }
    : { spent: null, received: amount };
}
