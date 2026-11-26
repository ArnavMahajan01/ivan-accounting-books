import { describe, expect, it } from 'vitest';
import { RULES } from '../test-bridge';
import {
  bankAccountsText,
  emptyForm,
  formFromRule,
  ruleFromForm,
  thenText,
  whenText,
} from './rule-text';

const [timber, fuel, phone] = RULES.rules;
if (timber === undefined || fuel === undefined || phone === undefined) throw new Error('rules');

describe('a rule in words', () => {
  it('says when it applies, and what it gives', () => {
    expect(whenText(fuel)).toBe('Description contains "AMPOL" or Description contains "SHELL"');
    expect(thenText(timber, RULES)).toBe('Materials and supplies · GST');
    expect(thenText(phone, RULES)).toBe(
      'Split: 70% Office supplies, 30% Tools and small equipment',
    );
    expect(bankAccountsText(timber, RULES)).toBe('All');
    expect(bankAccountsText(fuel, RULES)).toBe('Business One ··4821');
  });
});

describe('the form and the rule', () => {
  it('a saved rule comes back from its form unchanged', () => {
    for (const rule of [timber, fuel, phone]) {
      const input = {
        name: rule.name,
        direction: rule.direction,
        bankAccountIds: rule.bankAccountIds,
        matchMode: rule.matchMode,
        conditions: rule.conditions,
        target: rule.target,
        payeeId: rule.payeeId,
        autoPost: rule.autoPost,
      };
      expect(ruleFromForm(formFromRule(input, RULES), RULES)).toEqual({ ok: true, rule: input });
    }
  });

  it('says what is missing, in words', () => {
    const form = emptyForm();
    expect(ruleFromForm(form, RULES)).toEqual({ ok: false, problem: 'Give the rule a name.' });
    expect(ruleFromForm({ ...form, name: 'Fuel' }, RULES)).toMatchObject({
      problem: 'Type the words each description test looks for.',
    });
    const withText = {
      ...form,
      name: 'Fuel',
      conditions: [
        {
          ...form.conditions[0],
          key: 1,
          field: 'description' as const,
          op: 'contains' as const,
          text: 'AMPOL',
          amountText: '',
          maxText: '',
        },
      ],
    };
    expect(ruleFromForm(withText, RULES)).toMatchObject({
      problem: 'Choose the account these lines go to.',
    });
    const split = {
      ...withText,
      split: true,
      parts: [
        { key: 1, accountText: '6060', taxCodeId: null, percentText: '70' },
        { key: 2, accountText: '6110', taxCodeId: null, percentText: '20' },
      ],
    };
    expect(ruleFromForm(split, RULES)).toMatchObject({
      problem: 'The split must add up to 100%. It adds up to 90%.',
    });
    expect(
      ruleFromForm({ ...withText, accountText: '5000', payeeText: 'Nobody' }, RULES),
    ).toMatchObject({
      problem: 'Choose a payee from the list, or leave it empty.',
    });
  });

  it('reads an amount between two figures', () => {
    const form = {
      ...emptyForm(),
      name: 'Small fees',
      accountText: '6010',
      conditions: [
        {
          key: 1,
          field: 'amount' as const,
          op: 'between' as const,
          text: '',
          amountText: '1.00',
          maxText: '$20.00',
        },
      ],
    };
    expect(ruleFromForm(form, RULES)).toMatchObject({
      ok: true,
      rule: { conditions: [{ field: 'amount', op: 'between', min: 100, max: 2000 }] },
    });
  });
});
