import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { IMPORT_REFUSALS, REJECTION_CODES, type ImportBalanceView } from '@shared/views';
import { date } from '../test-bridge';
import { balanceMessage, refusalText, rejectionProblem } from './import-text';

describe('refusalText', () => {
  it('has plain words for every reason, and names the last four digits when they matter', () => {
    for (const reason of IMPORT_REFUSALS) {
      const text = refusalText(reason, '9999');
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/[a-z]+-[a-z]+/); // no code such as "unknown-account"
    }
    expect(refusalText('unknown-account', '9999')).toBe(
      'This file is for an account ending 9999, which is not one of your bank accounts.',
    );
  });
});

describe('rejectionProblem', () => {
  it('says what is wrong with each kind of line, and shows a bad date the Australian way', () => {
    for (const code of REJECTION_CODES) {
      expect(rejectionProblem(code, '12')).toMatch(/^has /);
    }
    expect(rejectionProblem('impossible-date', '20261131')).toBe(
      'has the date "31/11/2026", which is not a real date',
    );
    expect(rejectionProblem('not-a-date', 'soon')).toBe('has the date "soon", which is not a date');
  });
});

describe('balanceMessage', () => {
  const closingDate = date('2026-11-20');
  const base = { closing: asCents(2130790), closingDate };

  it('says the balance matches, with both figures', () => {
    expect(balanceMessage({ kind: 'match', ...base }, 0)).toEqual({
      tone: 'ok',
      title: 'Closing balance matches.',
      detail: 'File: $21,307.90 on 20/11/2026. Your books after import: $21,307.90.',
    });
  });

  it('names a rejected line as the reason for a difference only when it is', () => {
    const difference: ImportBalanceView = {
      kind: 'difference',
      ...base,
      expected: asCents(2120790),
      difference: asCents(10000),
      explainedByRejected: true,
    };
    expect(balanceMessage(difference, 1).detail).toBe(
      'File: $21,307.90 on 20/11/2026. Your books after import: $21,207.90. The difference, $100.00, is the line that could not be read. You can still import the other lines. The balance will not match until that line is in.',
    );
    expect(balanceMessage(difference, 2).detail).toContain(
      'is the total of the lines that could not be read',
    );
    expect(
      balanceMessage({ ...difference, explainedByRejected: false, difference: asCents(-10000) }, 0)
        .detail,
    ).toContain(
      'The difference is $100.00. You can still import. A line may be missing from this file or from an earlier one.',
    );
  });

  it('is plain about a file with nothing to compare with', () => {
    expect(balanceMessage({ kind: 'first-file', ...base }, 0).title).toBe(
      'First file for this account.',
    );
    expect(balanceMessage({ kind: 'no-starting-point', ...base }, 0).tone).toBe('info');
    expect(balanceMessage({ kind: 'no-closing-balance' }, 0).title).toBe(
      'Closing balance not checked.',
    );
  });
});
