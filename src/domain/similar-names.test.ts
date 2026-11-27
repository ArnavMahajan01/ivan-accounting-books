import { describe, expect, it } from 'vitest';
import {
  likelyPairs,
  nameWords,
  pairKey,
  similarNames,
  type ContactForPairing,
} from './similar-names';

const contact = (
  id: string,
  name: string,
  words: string[] = [],
  abn: string | null = null,
): ContactForPairing => ({ id, name, words, abn });

describe('names that look the same (spec 124)', () => {
  it('drops company words and punctuation', () => {
    expect(nameWords('Ng & Sons Constructions Pty Ltd')).toEqual(['NG', 'SONS', 'CONSTRUCTIONS']);
  });

  it('finds a name cut short, or with a word added', () => {
    expect(similarNames('Smith Renov', 'Smith Renovations')).toBe(true);
    expect(similarNames('Bunnings', 'Bunnings Warehouse')).toBe(true);
    expect(similarNames('Timberlink Supplies Pty Ltd', 'Timberlink')).toBe(true);
    expect(similarNames('Officeworks', 'OFFICEWORKS')).toBe(true);
  });

  it('leaves different businesses apart', () => {
    expect(similarNames('Smith Renovations', 'Smith Plumbing')).toBe(false);
    expect(similarNames('K Patel', 'K Smith')).toBe(false);
    expect(similarNames('Ellis Bathrooms', 'Coastal Body Corporate')).toBe(false);
    expect(similarNames('Pty Ltd', 'Pty Ltd')).toBe(false);
  });
});

describe('likely pairs (spec 124)', () => {
  const contacts = [
    contact('con_a', 'Bunnings', ['BUNNINGS']),
    contact('con_b', 'Hardware Warehouse', ['BUNNINGS WAREHOUSE']),
    contact('con_c', 'Smith Renov'),
    contact('con_d', 'Smith Renovations'),
    contact('con_e', 'Harbourview Developments', [], '51824753556'),
    contact('con_f', 'HV Dev', [], '51824753556'),
    contact('con_g', 'Ellis Bathrooms'),
  ];

  it('offers each pair once, with why, strongest reason first', () => {
    expect(likelyPairs(contacts, new Set())).toEqual([
      { first: 'con_e', second: 'con_f', reason: 'same-abn' },
      { first: 'con_a', second: 'con_b', reason: 'same-bank-words' },
      { first: 'con_c', second: 'con_d', reason: 'similar-names' },
    ]);
  });

  it('leaves out a pair he chose to keep, whichever way round', () => {
    const kept = new Set([pairKey('con_d', 'con_c')]);
    expect(likelyPairs(contacts, kept).map((p) => p.reason)).toEqual([
      'same-abn',
      'same-bank-words',
    ]);
  });
});
