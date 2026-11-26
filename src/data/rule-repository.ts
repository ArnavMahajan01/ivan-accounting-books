// Bank rules (spec 078). The conditions and the split are stored as JSON and checked with Zod
// whenever they are read back, so a rule the app did not write can never be applied.

import { z } from 'zod';
import { asCents } from '@shared/money';
import {
  DESCRIPTION_OPS,
  RULE_DIRECTIONS,
  RULE_MATCH_MODES,
  type Rule,
  type RuleCondition,
  type RuleTarget,
} from '@shared/rule-types';
import type { Db } from './database';
import { flagColumn, timestampColumn } from './row-types';

const COLUMNS = `id, name, position, direction, bank_account_ids, match_mode, conditions, account_id,
  tax_code_id, split, payee_id, auto_post, active, created_at, updated_at`;

const cents = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(asCents);

const conditionSchema = z.union([
  z.strictObject({
    field: z.literal('description'),
    op: z.enum(DESCRIPTION_OPS),
    text: z.string(),
  }),
  z.strictObject({ field: z.literal('amount'), op: z.literal('equals'), amount: cents }),
  z.strictObject({ field: z.literal('amount'), op: z.literal('between'), min: cents, max: cents }),
]);

const splitSchema = z.array(
  z.strictObject({
    accountId: z.string().regex(/^acc_/),
    taxCodeId: z.string().regex(/^tax_/).nullable(),
    percentBp: z.number().int().min(1).max(10_000),
  }),
);

const rowSchema = z.object({
  id: z.string().regex(/^rul_/),
  name: z.string(),
  position: z.number().int().min(0),
  direction: z.enum(RULE_DIRECTIONS),
  bank_account_ids: z.string(),
  match_mode: z.enum(RULE_MATCH_MODES),
  conditions: z.string(),
  account_id: z.string().regex(/^acc_/).nullable(),
  tax_code_id: z.string().regex(/^tax_/).nullable(),
  split: z.string().nullable(),
  payee_id: z.string().regex(/^con_/).nullable(),
  auto_post: flagColumn,
  active: flagColumn,
  created_at: timestampColumn,
  updated_at: timestampColumn,
});

function toRule(row: unknown): Rule {
  const r = rowSchema.parse(row);
  const conditions: RuleCondition[] = z.array(conditionSchema).parse(JSON.parse(r.conditions));
  const target: RuleTarget =
    r.split === null
      ? { kind: 'account', accountId: z.string().parse(r.account_id), taxCodeId: r.tax_code_id }
      : { kind: 'split', parts: splitSchema.parse(JSON.parse(r.split)) };
  return {
    id: r.id,
    name: r.name,
    position: r.position,
    direction: r.direction,
    bankAccountIds: z.array(z.string().regex(/^bnk_/)).parse(JSON.parse(r.bank_account_ids)),
    matchMode: r.match_mode,
    conditions,
    target,
    payeeId: r.payee_id,
    autoPost: r.auto_post,
    active: r.active,
  };
}

/** Every rule, in the order they are tried. */
export function listRules(db: Db): Rule[] {
  return db.prepare(`SELECT ${COLUMNS} FROM rule ORDER BY position, id`).all().map(toRule);
}

export function getRule(db: Db, id: string): Rule | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM rule WHERE id = ?`).get(id);
  return row === undefined ? null : toRule(row);
}

function values(rule: Rule, at: string) {
  return {
    id: rule.id,
    name: rule.name,
    position: rule.position,
    direction: rule.direction,
    bankAccountIds: JSON.stringify(rule.bankAccountIds),
    matchMode: rule.matchMode,
    conditions: JSON.stringify(rule.conditions),
    accountId: rule.target.kind === 'account' ? rule.target.accountId : null,
    taxCodeId: rule.target.kind === 'account' ? rule.target.taxCodeId : null,
    split: rule.target.kind === 'split' ? JSON.stringify(rule.target.parts) : null,
    payeeId: rule.payeeId,
    autoPost: rule.autoPost ? 1 : 0,
    active: rule.active ? 1 : 0,
    at,
  };
}

export function insertRule(db: Db, rule: Rule, at: string): void {
  db.prepare(
    `INSERT INTO rule (${COLUMNS}) VALUES (@id, @name, @position, @direction, @bankAccountIds,
      @matchMode, @conditions, @accountId, @taxCodeId, @split, @payeeId, @autoPost, @active, @at, @at)`,
  ).run(values(rule, at));
}

export function updateRule(db: Db, rule: Rule, at: string): void {
  db.prepare(
    `UPDATE rule SET name = @name, position = @position, direction = @direction,
      bank_account_ids = @bankAccountIds, match_mode = @matchMode, conditions = @conditions,
      account_id = @accountId, tax_code_id = @taxCodeId, split = @split, payee_id = @payeeId,
      auto_post = @autoPost, active = @active, updated_at = @at WHERE id = @id`,
  ).run(values(rule, at));
}

export function deleteRule(db: Db, id: string): void {
  db.prepare('DELETE FROM rule WHERE id = ?').run(id);
}
