import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { REVIEW, reviewLine } from '../test-bridge';
import {
  accountLabel,
  actionFor,
  findAccount,
  initialDraft,
  outcomeText,
  payeeSavedText,
  spentAndReceived,
  type RowDraft,
} from './review-text';

const accounts = REVIEW.accounts;
const draft = (over: Partial<RowDraft> = {}): RowDraft => ({
  mode: 'auto',
  accountText: '',
  taxCodeId: null,
  payeeText: '',
  ...over,
});

describe('findAccount', () => {
  it.each([
    ['5000 Materials and supplies', 'acc_mat'],
    ['5000', 'acc_mat'],
    ['materials and supplies', 'acc_mat'],
    ['Mat', 'acc_mat'],
    ['  6010  ', 'acc_fees'],
    ['Tools', 'acc_tools'],
  ])('%s is %s', (text, id) => {
    expect(findAccount(text, accounts)?.id).toBe(id);
  });

  it.each(['', 'Nothing like it', '6'])('%s is no account', (text) => {
    expect(findAccount(text, accounts)).toBeNull();
  });
});

describe('initialDraft', () => {
  it('starts with the suggestion and the payee the app has', () => {
    const line = REVIEW.lines[0];
    if (line === undefined) throw new Error('line');
    expect(initialDraft(line, REVIEW)).toEqual({
      mode: 'auto',
      accountText: '5000 Materials and supplies',
      taxCodeId: 'tax_gst',
      payeeText: 'Timberlink Supplies',
    });
  });

  it('starts empty with no suggestion', () => {
    expect(initialDraft(reviewLine(), REVIEW)).toEqual(draft());
  });
});

describe('actionFor', () => {
  it('follows a match, or a transfer, until he chooses an account', () => {
    const match = reviewLine({
      match: { entryId: 'ent_1', date: '2026-11-02' as never, text: 'Ampol' },
    });
    expect(actionFor(match, draft(), REVIEW)).toEqual({
      kind: 'match',
      lineId: match.id,
      entryId: 'ent_1',
    });
    const transfer = REVIEW.lines[4];
    if (transfer === undefined) throw new Error('line');
    expect(actionFor(transfer, draft(), REVIEW)).toEqual({
      kind: 'transfer',
      lineId: 'stl_transfer',
      otherBankAccountId: 'bnk_reserve',
    });
    expect(actionFor(match, draft({ mode: 'account', accountText: '6010' }), REVIEW)).toMatchObject(
      {
        kind: 'account',
        accountId: 'acc_fees',
      },
    );
  });

  it('posts to the account typed, with no account when it fits none', () => {
    const line = reviewLine();
    expect(actionFor(line, draft({ accountText: 'Office', taxCodeId: 'tax_gst' }), REVIEW)).toEqual(
      {
        kind: 'account',
        lineId: line.id,
        accountId: 'acc_office',
        taxCodeId: 'tax_gst',
        payeeId: null,
      },
    );
    expect(actionFor(line, draft({ accountText: 'zz' }), REVIEW)).toMatchObject({
      accountId: null,
    });
  });

  it('names a saved contact typed in From/To, in any capitals', () => {
    expect(actionFor(reviewLine(), draft({ payeeText: 'ellis bathrooms' }), REVIEW)).toMatchObject({
      payeeId: 'con_ellis',
    });
  });
});

describe('outcomeText', () => {
  it('says how many were posted and why the rest were not', () => {
    expect(
      outcomeText({
        posted: Array.from({ length: 12 }, (_, i) => `stl_${String(i)}`),
        alsoPosted: [],
        failed: [{ lineId: 'stl_x', reason: 'needs-account' }],
      }),
    ).toBe('12 posted. 1 needs an account.');
    expect(
      outcomeText({
        posted: [],
        alsoPosted: [],
        failed: [
          { lineId: 'a', reason: 'needs-account' },
          { lineId: 'b', reason: 'needs-account' },
          { lineId: 'c', reason: 'locked' },
        ],
      }),
    ).toBe('2 need an account. 1 is in a locked period.');
  });

  it('counts the other side of a transfer', () => {
    expect(outcomeText({ posted: ['a'], alsoPosted: ['b'], failed: [] })).toBe('2 posted.');
  });
});

describe('payeeSavedText', () => {
  const saved = {
    kind: 'saved' as const,
    contactId: 'con_1',
    name: 'Bunnings',
    created: true,
    kindOfContact: 'supplier' as const,
    words: 'BUNNINGS',
    alsoFilled: 2,
  };
  it('says what was saved and how many more lines show it', () => {
    expect(payeeSavedText(saved)).toBe('Saved Bunnings as a supplier. 2 more lines now show it.');
    expect(payeeSavedText({ ...saved, alsoFilled: 1 })).toBe(
      'Saved Bunnings as a supplier. 1 more line now shows it.',
    );
    expect(payeeSavedText({ ...saved, created: false, alsoFilled: 0 })).toBe(
      'Bunnings will fill in for lines like this.',
    );
  });
});

describe('small helpers', () => {
  it('labels an account with its code', () => {
    expect(accountLabel({ code: '5000', name: 'Materials and supplies' })).toBe(
      '5000 Materials and supplies',
    );
  });
  it('puts money out under Spent and money in under Received', () => {
    expect(spentAndReceived(asCents(-41260))).toEqual({ spent: 41260, received: null });
    expect(spentAndReceived(asCents(330000))).toEqual({ spent: null, received: 330000 });
  });
});
