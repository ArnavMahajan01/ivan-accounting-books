import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import type { Rule, RuleCondition, RuleInput } from '@shared/rule-types';
import { conditionHolds, firstFittingRule, ruleFits, ruleProblems, shareByPercent } from './rules';

const line = (description: string, amount: number, bankAccountId = 'bnk_one') => ({
  bankAccountId,
  description,
  amount: asCents(amount),
});

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: 'rul_1',
  name: 'Timberlink is always materials',
  position: 0,
  direction: 'out',
  bankAccountIds: [],
  matchMode: 'all',
  conditions: [{ field: 'description', op: 'contains', text: 'TIMBERLINK' }],
  target: { kind: 'account', accountId: 'acc_mat', taxCodeId: 'tax_gst' },
  payeeId: null,
  autoPost: false,
  active: true,
  ...over,
});

describe('conditionHolds', () => {
  it.each<[RuleCondition, string, number, boolean]>([
    [
      { field: 'description', op: 'contains', text: 'bunnings' },
      'EFTPOS BUNNINGS 4532',
      -100,
      true,
    ],
    [{ field: 'description', op: 'contains', text: 'BUNNINGS  4532' }, 'BUNNINGS 4532', -100, true],
    [{ field: 'description', op: 'is', text: 'skylink mobile' }, 'SKYLINK MOBILE', -100, true],
    [{ field: 'description', op: 'is', text: 'SKYLINK' }, 'SKYLINK MOBILE', -100, false],
    [{ field: 'description', op: 'starts-with', text: 'AMPOL' }, 'AMPOL ALEXANDRIA', -100, true],
    [{ field: 'description', op: 'starts-with', text: 'ALEX' }, 'AMPOL ALEXANDRIA', -100, false],
    [{ field: 'description', op: 'contains', text: '  ' }, 'ANYTHING', -100, false],
    [{ field: 'amount', op: 'equals', amount: asCents(1500) }, 'FEE', -1500, true],
    [{ field: 'amount', op: 'equals', amount: asCents(1500) }, 'FEE', 1500, true],
    [{ field: 'amount', op: 'between', min: asCents(1000), max: asCents(2000) }, 'X', -2000, true],
    [{ field: 'amount', op: 'between', min: asCents(1000), max: asCents(2000) }, 'X', -2001, false],
  ])('%j on %s %d is %s', (condition, description, amount, expected) => {
    expect(conditionHolds(condition, line(description, amount))).toBe(expected);
  });
});

describe('ruleFits', () => {
  it('keeps to its direction', () => {
    expect(ruleFits(rule(), line('TIMBERLINK SUPPLIES', -128470))).toBe(true);
    expect(ruleFits(rule(), line('TIMBERLINK REFUND', 5000))).toBe(false);
    expect(ruleFits(rule({ direction: 'both' }), line('TIMBERLINK REFUND', 5000))).toBe(true);
  });

  it('a rule limited to one account fits only that account', () => {
    const one = rule({ bankAccountIds: ['bnk_one'] });
    expect(ruleFits(one, line('TIMBERLINK', -100, 'bnk_one'))).toBe(true);
    expect(ruleFits(one, line('TIMBERLINK', -100, 'bnk_reserve'))).toBe(false);
  });

  it('all versus any', () => {
    const conditions: RuleCondition[] = [
      { field: 'description', op: 'contains', text: 'AMPOL' },
      { field: 'description', op: 'contains', text: 'SHELL' },
    ];
    expect(ruleFits(rule({ conditions, matchMode: 'all' }), line('AMPOL MASCOT', -100))).toBe(
      false,
    );
    expect(ruleFits(rule({ conditions, matchMode: 'any' }), line('AMPOL MASCOT', -100))).toBe(true);
    expect(ruleFits(rule({ conditions, matchMode: 'any' }), line('SHELL COLES', -100))).toBe(true);
  });

  it('a rule with no conditions fits nothing', () => {
    expect(ruleFits(rule({ conditions: [] }), line('TIMBERLINK', -100))).toBe(false);
  });
});

describe('firstFittingRule', () => {
  const broad = rule({
    id: 'rul_broad',
    position: 1,
    conditions: [{ field: 'description', op: 'contains', text: 'SUPPLIES' }],
  });
  const narrow = rule({ id: 'rul_narrow', position: 0 });

  it('takes the first by order, whatever order they are given in', () => {
    expect(firstFittingRule([broad, narrow], line('TIMBERLINK SUPPLIES', -100))?.id).toBe(
      'rul_narrow',
    );
    const moved = [
      { ...broad, position: 0 },
      { ...narrow, position: 1 },
    ];
    expect(firstFittingRule(moved, line('TIMBERLINK SUPPLIES', -100))?.id).toBe('rul_broad');
  });

  it('skips a rule that is turned off, and gives null when none fits', () => {
    expect(
      firstFittingRule([{ ...narrow, active: false }, broad], line('TIMBERLINK SUPPLIES', -100))
        ?.id,
    ).toBe('rul_broad');
    expect(firstFittingRule([narrow, broad], line('AMPOL', -100))).toBeNull();
  });
});

describe('shareByPercent', () => {
  const parts = (...bp: number[]) =>
    bp.map((percentBp, i) => ({ accountId: `acc_${String(i)}`, taxCodeId: null, percentBp }));

  it('shares exactly, with the cents left over on the last part', () => {
    expect(shareByPercent(asCents(12900), parts(7000, 3000))).toEqual([9030, 3870]);
    expect(shareByPercent(asCents(100), parts(3333, 3333, 3334))).toEqual([33, 33, 34]);
    expect(shareByPercent(asCents(1), parts(5000, 5000))).toEqual([0, 1]);
  });

  it('always adds up to the amount', () => {
    for (let gross = 1; gross < 500; gross += 7) {
      const shared = shareByPercent(asCents(gross), parts(3333, 3333, 3334));
      expect(shared.reduce((a, b) => a + b, 0)).toBe(gross);
    }
  });
});

describe('ruleProblems', () => {
  const input = (over: Partial<RuleInput> = {}): RuleInput => {
    const r = rule();
    return {
      name: r.name,
      direction: r.direction,
      bankAccountIds: r.bankAccountIds,
      matchMode: r.matchMode,
      conditions: r.conditions,
      target: r.target,
      payeeId: r.payeeId,
      autoPost: r.autoPost,
      ...over,
    };
  };

  it('accepts a sound rule', () => {
    expect(ruleProblems(input())).toEqual([]);
  });

  it('needs a name, a condition and text in each description test', () => {
    expect(ruleProblems(input({ name: ' ' }))).toEqual(['empty-name']);
    expect(ruleProblems(input({ conditions: [] }))).toEqual(['no-conditions']);
    expect(
      ruleProblems(input({ conditions: [{ field: 'description', op: 'is', text: '' }] })),
    ).toEqual(['empty-text']);
    expect(
      ruleProblems(
        input({
          conditions: [{ field: 'amount', op: 'between', min: asCents(500), max: asCents(100) }],
        }),
      ),
    ).toEqual(['bad-amount']);
  });

  it('a split must add to 100% with at least two parts', () => {
    const split = (...bp: number[]) =>
      input({
        target: {
          kind: 'split',
          parts: bp.map((percentBp) => ({ accountId: 'acc_x', taxCodeId: null, percentBp })),
        },
      });
    expect(ruleProblems(split(7000, 3000))).toEqual([]);
    expect(ruleProblems(split(7000, 2000))).toEqual(['split-not-100']);
    expect(ruleProblems(split(10000))).toEqual(['split-too-few']);
    expect(ruleProblems(split(10500, -500))).toEqual(['bad-percent']);
  });
});
