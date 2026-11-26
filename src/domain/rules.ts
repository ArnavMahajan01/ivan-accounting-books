// Which bank rule applies to a line (spec 078), and the checks a rule must pass before it is saved
// (spec 080). Pure: the caller reads the rules and the line.
//
// A rule fits a line when the line goes the rule's way (money in, out, or either), is in one of
// the rule's bank accounts (or the rule is for every account), and its conditions hold: all of
// them, or any one. Description tests ignore capitals and extra spaces. Amount tests use the amount
// without its sign. Rules are tried in order, and the first active one that fits wins, as in
// QuickBooks.

import { asCents, type Cents } from '@shared/money';
import {
  BASIS_POINTS_WHOLE,
  type Rule,
  type RuleCondition,
  type RuleInput,
  type RuleSplitPart,
} from '@shared/rule-types';

export interface RuleLine {
  readonly bankAccountId: string;
  readonly description: string;
  /** Money in is positive, money out negative. */
  readonly amount: Cents;
}

const normal = (text: string) => text.trim().replace(/\s+/g, ' ').toUpperCase();

export function conditionHolds(condition: RuleCondition, line: RuleLine): boolean {
  if (condition.field === 'description') {
    const description = normal(line.description);
    const text = normal(condition.text);
    if (text === '') return false;
    switch (condition.op) {
      case 'contains':
        return description.includes(text);
      case 'is':
        return description === text;
      case 'starts-with':
        return description.startsWith(text);
    }
  }
  const size = Math.abs(line.amount);
  return condition.op === 'equals'
    ? size === condition.amount
    : size >= condition.min && size <= condition.max;
}

export function ruleFits(
  rule: Pick<Rule, 'direction' | 'bankAccountIds' | 'matchMode' | 'conditions'>,
  line: RuleLine,
): boolean {
  if (rule.direction === 'in' && line.amount < 0) return false;
  if (rule.direction === 'out' && line.amount > 0) return false;
  if (rule.bankAccountIds.length > 0 && !rule.bankAccountIds.includes(line.bankAccountId)) {
    return false;
  }
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map((c) => conditionHolds(c, line));
  return rule.matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);
}

/** The first active rule, by position, that fits the line. */
export function firstFittingRule<R extends Rule>(rules: readonly R[], line: RuleLine): R | null {
  const ordered = [...rules].filter((r) => r.active).sort((a, b) => a.position - b.position);
  return ordered.find((rule) => ruleFits(rule, line)) ?? null;
}

/**
 * Shares an amount by the split's percentages, in whole cents. Each part is rounded down, and the
 * cents left over go to the last part, so the parts always add up to the amount exactly.
 */
export function shareByPercent(gross: Cents, parts: readonly RuleSplitPart[]): Cents[] {
  const shares = parts.map((p) => Math.floor((gross * p.percentBp) / BASIS_POINTS_WHOLE));
  const given = shares.reduce((sum, s) => sum + s, 0);
  if (shares.length > 0) shares[shares.length - 1] = (shares.at(-1) ?? 0) + gross - given;
  return shares.map(asCents);
}

export type RuleProblem =
  | 'empty-name'
  | 'no-conditions'
  | 'empty-text'
  | 'bad-amount'
  | 'split-too-few'
  | 'split-not-100'
  | 'bad-percent';

/** Every reason the rule may not be saved. Empty means it may. */
export function ruleProblems(rule: RuleInput): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rule.name.trim() === '') problems.push('empty-name');
  if (rule.conditions.length === 0) problems.push('no-conditions');
  for (const c of rule.conditions) {
    if (c.field === 'description' && c.text.trim() === '') problems.push('empty-text');
    if (c.field === 'amount') {
      const bad = c.op === 'equals' ? c.amount <= 0 : c.min < 0 || c.max <= 0 || c.min > c.max;
      if (bad) problems.push('bad-amount');
    }
  }
  if (rule.target.kind === 'split') {
    const { parts } = rule.target;
    if (parts.length < 2) problems.push('split-too-few');
    if (parts.some((p) => !Number.isInteger(p.percentBp) || p.percentBp <= 0)) {
      problems.push('bad-percent');
    }
    if (parts.reduce((sum, p) => sum + p.percentBp, 0) !== BASIS_POINTS_WHOLE) {
      problems.push('split-not-100');
    }
  }
  return [...new Set(problems)];
}
