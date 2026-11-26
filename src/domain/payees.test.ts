import { describe, expect, it } from 'vitest';
import { contactForWords, descriptionWords, wordsStartWith } from './payees';

describe('descriptionWords', () => {
  it.each([
    ['BUNNINGS 4532', 'BUNNINGS'],
    ['Bunnings 8812 Alexandria', 'BUNNINGS ALEXANDRIA'],
    ['STAPLES & CO', 'STAPLES CO'],
    ['DEPOSIT ELLIS BATHROOMS INV 1058', 'DEPOSIT ELLIS BATHROOMS INV'],
    ['TIMBERLINK SUPPLIES PTY. LTD.', 'TIMBERLINK SUPPLIES PTY LTD'],
    ['4532 0412', ''],
    ['A 1 B', ''],
  ])('%s gives %s', (description, words) => {
    expect(descriptionWords(description)).toBe(words);
  });
});

describe('wordsStartWith', () => {
  it('fits whole words at the start only', () => {
    expect(wordsStartWith('BUNNINGS ALEXANDRIA', 'BUNNINGS')).toBe(true);
    expect(wordsStartWith('BUNNINGS', 'BUNNINGS')).toBe(true);
    expect(wordsStartWith('BUNNINGSWAREHOUSE', 'BUNNINGS')).toBe(false);
    expect(wordsStartWith('EFTPOS BUNNINGS', 'BUNNINGS')).toBe(false);
    expect(wordsStartWith('BUNNINGS', '')).toBe(false);
  });
});

describe('contactForWords', () => {
  const matches = [
    { words: 'DEPOSIT', contactId: 'con_wrong' },
    { words: 'DEPOSIT ELLIS BATHROOMS', contactId: 'con_ellis' },
    { words: 'BUNNINGS', contactId: 'con_bunnings' },
  ];

  it('picks the longest saved words that fit', () => {
    expect(contactForWords('DEPOSIT ELLIS BATHROOMS INV', matches)?.contactId).toBe('con_ellis');
    expect(contactForWords('BUNNINGS ALEXANDRIA', matches)?.contactId).toBe('con_bunnings');
  });

  it('gives null when nothing fits', () => {
    expect(contactForWords('AMPOL ALEXANDRIA', matches)).toBeNull();
    expect(contactForWords('', matches)).toBeNull();
  });
});
