import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { checkClosingBalance } from './balance-check';

const c = asCents;

describe('the closing balance check', () => {
  it('matches when the lines held add up to the statement', () => {
    expect(
      checkClosingBalance({
        before: c(1_491_745),
        hasEarlierFiles: true,
        newLines: [c(495_000), c(-9_640), c(-34_215)],
        closing: c(1_942_890),
        rejected: [],
      }),
    ).toEqual({ kind: 'match', expected: 1_942_890 });
  });

  it('matches with no new lines when the same file comes again', () => {
    expect(
      checkClosingBalance({
        before: c(1_864_235),
        hasEarlierFiles: true,
        newLines: [],
        closing: c(1_864_235),
        rejected: [],
      }),
    ).toEqual({ kind: 'match', expected: 1_864_235 });
  });

  it('gives the difference, and says a rejected line explains it when it is exactly that', () => {
    expect(
      checkClosingBalance({
        before: c(1_000_000),
        hasEarlierFiles: true,
        newLines: [c(-5_000)],
        closing: c(985_000),
        rejected: [c(-10_000)],
      }),
    ).toEqual({
      kind: 'difference',
      expected: 995_000,
      difference: -10_000,
      explainedByRejected: true,
    });
  });

  it('adds up several rejected lines before it says they explain the difference', () => {
    const result = checkClosingBalance({
      before: c(0),
      hasEarlierFiles: true,
      newLines: [],
      closing: c(-300),
      rejected: [c(-100), c(-200)],
    });
    expect(result).toMatchObject({
      kind: 'difference',
      difference: -300,
      explainedByRejected: true,
    });
  });

  it('does not say a rejected line explains a difference it does not equal', () => {
    expect(
      checkClosingBalance({
        before: c(0),
        hasEarlierFiles: true,
        newLines: [],
        closing: c(500),
        rejected: [c(-10_000)],
      }),
    ).toMatchObject({ kind: 'difference', difference: 500, explainedByRejected: false });
    expect(
      checkClosingBalance({
        before: c(0),
        hasEarlierFiles: true,
        newLines: [],
        closing: c(500),
        rejected: [],
      }),
    ).toMatchObject({ kind: 'difference', explainedByRejected: false });
  });

  it('does not say it explains the difference when a rejected line’s amount could not be read', () => {
    expect(
      checkClosingBalance({
        before: c(0),
        hasEarlierFiles: true,
        newLines: [],
        closing: c(-100),
        rejected: [c(-100), null],
      }),
    ).toMatchObject({ kind: 'difference', explainedByRejected: false });
  });

  it('has nothing to compare with for the first file, and nothing to check without a closing balance', () => {
    expect(
      checkClosingBalance({
        before: null,
        hasEarlierFiles: false,
        newLines: [c(1)],
        closing: c(1),
        rejected: [],
      }),
    ).toEqual({ kind: 'first-file' });
    expect(
      checkClosingBalance({
        before: null,
        hasEarlierFiles: true,
        newLines: [c(1)],
        closing: c(1),
        rejected: [],
      }),
    ).toEqual({ kind: 'no-starting-point' });
    expect(
      checkClosingBalance({
        before: c(0),
        hasEarlierFiles: true,
        newLines: [c(1)],
        closing: null,
        rejected: [],
      }),
    ).toEqual({ kind: 'no-closing-balance' });
    expect(
      checkClosingBalance({
        before: null,
        hasEarlierFiles: false,
        newLines: [],
        closing: null,
        rejected: [],
      }),
    ).toEqual({ kind: 'no-closing-balance' });
  });
});
