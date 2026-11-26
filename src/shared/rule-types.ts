// What a bank rule is (spec 078), shared by the rules, the bridge and the Rules page.

import type { Cents } from './money';

export const RULE_DIRECTIONS = ['out', 'in', 'both'] as const;
export type RuleDirection = (typeof RULE_DIRECTIONS)[number];

export const RULE_MATCH_MODES = ['all', 'any'] as const;
export type RuleMatchMode = (typeof RULE_MATCH_MODES)[number];

export const DESCRIPTION_OPS = ['contains', 'is', 'starts-with'] as const;
export type DescriptionOp = (typeof DESCRIPTION_OPS)[number];

/** A test on a bank line. Amounts are compared without their sign: $412.60 in or out is 41260. */
export type RuleCondition =
  | { readonly field: 'description'; readonly op: DescriptionOp; readonly text: string }
  | { readonly field: 'amount'; readonly op: 'equals'; readonly amount: Cents }
  | { readonly field: 'amount'; readonly op: 'between'; readonly min: Cents; readonly max: Cents };

/** One share of a split rule. Percentages are basis points: 7000 is 70%. They add up to 10000. */
export interface RuleSplitPart {
  readonly accountId: string;
  readonly taxCodeId: string | null;
  readonly percentBp: number;
}

export type RuleTarget =
  | { readonly kind: 'account'; readonly accountId: string; readonly taxCodeId: string | null }
  | { readonly kind: 'split'; readonly parts: readonly RuleSplitPart[] };

/** A rule as he writes it, before it is saved. */
export interface RuleInput {
  readonly name: string;
  readonly direction: RuleDirection;
  /** Empty means every bank account. */
  readonly bankAccountIds: readonly string[];
  readonly matchMode: RuleMatchMode;
  readonly conditions: readonly RuleCondition[];
  readonly target: RuleTarget;
  readonly payeeId: string | null;
  /** Lines it fits are posted on import, without waiting in To review (spec 081). */
  readonly autoPost: boolean;
}

export interface Rule extends RuleInput {
  readonly id: string;
  /** Rules are tried from 0 up, and the first that fits wins. */
  readonly position: number;
  readonly active: boolean;
}

export const BASIS_POINTS_WHOLE = 10_000;
