// The Rules page's plain logic (specs 079, 080): a rule in words, and the edit panel's form turned
// into a rule, with what is wrong with it in words.

import type { RulesView } from '@shared/bridge-contract';
import { formatCents, parseCents, type Cents } from '@shared/money';
import type {
  DescriptionOp,
  Rule,
  RuleCondition,
  RuleDirection,
  RuleInput,
  RuleMatchMode,
} from '@shared/rule-types';
import { accountLabel, findAccount } from '../review/review-text';

const OP_WORDS: Record<DescriptionOp, string> = {
  contains: 'contains',
  is: 'is',
  'starts-with': 'starts with',
};

export function conditionText(c: RuleCondition): string {
  if (c.field === 'description') return `Description ${OP_WORDS[c.op]} "${c.text}"`;
  return c.op === 'equals'
    ? `Amount is ${formatCents(c.amount)}`
    : `Amount is ${formatCents(c.min)} to ${formatCents(c.max)}`;
}

/** "Description contains "AMPOL" or "SHELL"": joined by "and" or "or" as the rule says. */
export function whenText(rule: Pick<Rule, 'conditions' | 'matchMode'>): string {
  return rule.conditions.map(conditionText).join(rule.matchMode === 'all' ? ' and ' : ' or ');
}

export function thenText(
  rule: Pick<Rule, 'target'>,
  view: Pick<RulesView, 'accounts' | 'taxCodes'>,
): string {
  const name = (id: string) =>
    view.accounts.find((a) => a.id === id)?.name ?? 'an account no longer used';
  const code = (id: string | null) =>
    id === null ? '' : ` · ${view.taxCodes.find((t) => t.id === id)?.shortCode ?? ''}`;
  if (rule.target.kind === 'account')
    return `${name(rule.target.accountId)}${code(rule.target.taxCodeId)}`;
  return `Split: ${rule.target.parts.map((p) => `${String(p.percentBp / 100)}% ${name(p.accountId)}`).join(', ')}`;
}

export function bankAccountsText(
  rule: Pick<Rule, 'bankAccountIds'>,
  view: Pick<RulesView, 'bankAccounts'>,
): string {
  if (rule.bankAccountIds.length === 0) return 'All';
  return rule.bankAccountIds
    .map((id) => view.bankAccounts.find((b) => b.id === id)?.name ?? '')
    .join(', ');
}

export const DIRECTION_WORDS: Record<RuleDirection, string> = {
  out: 'Money out',
  in: 'Money in',
  both: 'Money in or out',
};

// ---- The edit panel's form ------------------------------------------------------------------------

export type ConditionOp = DescriptionOp | 'equals' | 'between';

export interface ConditionForm {
  readonly key: number;
  readonly field: 'description' | 'amount';
  readonly op: ConditionOp;
  readonly text: string;
  readonly amountText: string;
  readonly maxText: string;
}

export interface SplitForm {
  readonly key: number;
  readonly accountText: string;
  readonly taxCodeId: string | null;
  readonly percentText: string;
}

export interface RuleForm {
  readonly name: string;
  readonly direction: RuleDirection;
  readonly bankAccountIds: readonly string[];
  readonly matchMode: RuleMatchMode;
  readonly conditions: readonly ConditionForm[];
  readonly split: boolean;
  readonly accountText: string;
  readonly taxCodeId: string | null;
  readonly parts: readonly SplitForm[];
  readonly payeeText: string;
  readonly autoPost: boolean;
}

export function blankCondition(key: number): ConditionForm {
  return { key, field: 'description', op: 'contains', text: '', amountText: '', maxText: '' };
}

export function emptyForm(): RuleForm {
  return {
    name: '',
    direction: 'out',
    bankAccountIds: [],
    matchMode: 'all',
    conditions: [blankCondition(1)],
    split: false,
    accountText: '',
    taxCodeId: null,
    parts: [
      { key: 1, accountText: '', taxCodeId: null, percentText: '' },
      { key: 2, accountText: '', taxCodeId: null, percentText: '' },
    ],
    payeeText: '',
    autoPost: false,
  };
}

const dollars = (cents: Cents) => formatCents(cents).replace(/[$,]/g, '');

/** A saved rule (or an offered one) as the form shows it. */
export function formFromRule(
  rule: RuleInput,
  view: Pick<RulesView, 'accounts' | 'contacts'>,
): RuleForm {
  const label = (id: string) => {
    const account = view.accounts.find((a) => a.id === id);
    return account === undefined ? '' : accountLabel(account);
  };
  return {
    name: rule.name,
    direction: rule.direction,
    bankAccountIds: rule.bankAccountIds,
    matchMode: rule.matchMode,
    conditions: rule.conditions.map((c, i) =>
      c.field === 'description'
        ? { ...blankCondition(i + 1), op: c.op, text: c.text }
        : c.op === 'equals'
          ? {
              ...blankCondition(i + 1),
              field: 'amount',
              op: 'equals',
              amountText: dollars(c.amount),
            }
          : {
              ...blankCondition(i + 1),
              field: 'amount',
              op: 'between',
              amountText: dollars(c.min),
              maxText: dollars(c.max),
            },
    ),
    split: rule.target.kind === 'split',
    accountText: rule.target.kind === 'account' ? label(rule.target.accountId) : '',
    taxCodeId: rule.target.kind === 'account' ? rule.target.taxCodeId : null,
    parts:
      rule.target.kind === 'split'
        ? rule.target.parts.map((p, i) => ({
            key: i + 1,
            accountText: label(p.accountId),
            taxCodeId: p.taxCodeId,
            percentText: String(p.percentBp / 100),
          }))
        : emptyForm().parts,
    payeeText: view.contacts.find((c) => c.id === rule.payeeId)?.name ?? '',
    autoPost: rule.autoPost,
  };
}

const typedCents = (text: string): Cents | null => {
  const parsed = parseCents(text.trim().replace(/^\$/, '').replace(/,/g, ''));
  return parsed.ok ? parsed.value : null;
};

/** "70" or "33.5" as basis points, or null. */
function typedPercent(text: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (match === null) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  return whole * 100 + fraction;
}

/** The form as a rule, or the first thing wrong with it, in words. */
export function ruleFromForm(
  form: RuleForm,
  view: Pick<RulesView, 'accounts' | 'contacts'>,
):
  | { readonly ok: true; readonly rule: RuleInput }
  | { readonly ok: false; readonly problem: string } {
  if (form.name.trim() === '') return { ok: false, problem: 'Give the rule a name.' };
  const conditions: RuleCondition[] = [];
  for (const c of form.conditions) {
    if (c.field === 'description') {
      if (c.text.trim() === '')
        return { ok: false, problem: 'Type the words each description test looks for.' };
      conditions.push({
        field: 'description',
        op: c.op === 'is' || c.op === 'starts-with' ? c.op : 'contains',
        text: c.text,
      });
    } else {
      const amount = typedCents(c.amountText);
      if (amount === null)
        return { ok: false, problem: 'Type each amount in dollars and cents, such as 15.00.' };
      if (c.op === 'between') {
        const max = typedCents(c.maxText);
        if (max === null || max < amount)
          return { ok: false, problem: 'The second amount must be the larger one.' };
        conditions.push({ field: 'amount', op: 'between', min: amount, max });
      } else {
        conditions.push({ field: 'amount', op: 'equals', amount });
      }
    }
  }
  if (conditions.length === 0) return { ok: false, problem: 'Add at least one condition.' };

  let target: RuleInput['target'];
  if (form.split) {
    const parts = [];
    for (const p of form.parts) {
      const account = findAccount(p.accountText, view.accounts);
      const percentBp = typedPercent(p.percentText);
      if (account === null)
        return { ok: false, problem: 'Choose an account for each part of the split.' };
      if (percentBp === null || percentBp <= 0)
        return { ok: false, problem: 'Type a percentage for each part, such as 70.' };
      parts.push({ accountId: account.id, taxCodeId: p.taxCodeId, percentBp });
    }
    const total = parts.reduce((sum, p) => sum + p.percentBp, 0);
    if (total !== 10_000) {
      return {
        ok: false,
        problem: `The split must add up to 100%. It adds up to ${String(total / 100)}%.`,
      };
    }
    target = { kind: 'split', parts };
  } else {
    const account = findAccount(form.accountText, view.accounts);
    if (account === null) return { ok: false, problem: 'Choose the account these lines go to.' };
    target = { kind: 'account', accountId: account.id, taxCodeId: form.taxCodeId };
  }

  const payee = form.payeeText.trim().toLowerCase();
  const contact =
    payee === '' ? null : (view.contacts.find((c) => c.name.toLowerCase() === payee) ?? null);
  if (payee !== '' && contact === null) {
    return { ok: false, problem: 'Choose a payee from the list, or leave it empty.' };
  }
  return {
    ok: true,
    rule: {
      name: form.name,
      direction: form.direction,
      bankAccountIds: form.bankAccountIds,
      matchMode: form.matchMode,
      conditions,
      target,
      payeeId: contact?.id ?? null,
      autoPost: form.autoPost,
    },
  };
}

/** A rule as the bridge takes it: the same rule, in plain arrays. */
export function toBridgeRule(rule: RuleInput) {
  return {
    ...rule,
    bankAccountIds: [...rule.bankAccountIds],
    conditions: [...rule.conditions],
    target:
      rule.target.kind === 'split'
        ? { kind: 'split' as const, parts: [...rule.target.parts] }
        : rule.target,
  };
}
