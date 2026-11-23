import { describe, expect, it } from 'vitest';
import { CHART_TEMPLATE } from './chart-template';

const byName = (name: string) => CHART_TEMPLATE.find((a) => a.name === name);

describe('the default chart', () => {
  it('has 30 to 40 accounts, each with a unique code and name', () => {
    expect(CHART_TEMPLATE.length).toBeGreaterThanOrEqual(30);
    expect(CHART_TEMPLATE.length).toBeLessThanOrEqual(40);
    expect(new Set(CHART_TEMPLATE.map((a) => a.code)).size).toBe(CHART_TEMPLATE.length);
    expect(new Set(CHART_TEMPLATE.map((a) => a.name)).size).toBe(CHART_TEMPLATE.length);
  });

  it('numbers each type in its usual range', () => {
    const first = {
      asset: ['1'],
      liability: ['2'],
      equity: ['3'],
      income: ['4'],
      expense: ['5', '6'],
    };
    for (const account of CHART_TEMPLATE) {
      expect(first[account.type], `${account.code} ${account.name}`).toContain(
        account.code.charAt(0),
      );
    }
  });

  it('has the accounts the spec names, of the right type', () => {
    expect(byName('Business cheque account')?.type).toBe('asset');
    expect(byName('GST')?.type).toBe('liability');
    expect(byName('PAYG withholding payable')?.type).toBe('liability');
    expect(byName('Owner drawings')?.type).toBe('equity');
    expect(byName('Share capital')?.type).toBe('equity');
    expect(byName('Retained earnings')?.type).toBe('equity');
    expect(byName('Suspense')).toBeDefined();
  });

  it('gives every account a GST code, the way the spec asks', () => {
    const byTax = (code: string) =>
      CHART_TEMPLATE.filter((a) => a.defaultTax === code).map((a) => a.name);
    expect(byTax('GST')).toContain('Sales');
    expect(byTax('GST')).toContain('Materials and supplies');
    expect(byTax('N-T')).toEqual(
      expect.arrayContaining([
        'Business cheque account',
        'GST',
        'Retained earnings',
        'Wages and salaries',
      ]),
    );
    expect(byTax('INP')).toEqual(['Interest income', 'Bank fees', 'Interest paid']);
    expect(byTax('FRE')).toEqual([]);
  });

  it('puts each sub-account under an account that exists', () => {
    for (const account of CHART_TEMPLATE) {
      if (account.parentCode !== undefined) {
        expect(CHART_TEMPLATE.some((a) => a.code === account.parentCode)).toBe(true);
      }
    }
  });
});
