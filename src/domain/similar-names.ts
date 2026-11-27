// Contacts that look like the same one (spec 124; W08b, Option 5). Contacts are saved by
// themselves from bank lines and invoices, so near-duplicates appear sooner or later: "Bunnings"
// and "Bunnings Warehouse", "Smith Renov" and "Smith Renovations". Pure: it is given the contacts,
// their saved bank words and the pairs he chose to keep, and says which pairs to offer and why.

import type { ContactPairReason } from '@shared/contacts';
import { wordsStartWith } from './payees';

export interface ContactForPairing {
  readonly id: string;
  readonly name: string;
  readonly abn: string | null;
  /** The bank description words saved for this contact (`contact_match`). */
  readonly words: readonly string[];
}

export type PairReason = ContactPairReason;

export interface LikelyPair {
  readonly first: string;
  readonly second: string;
  readonly reason: PairReason;
}

/** Words that say what sort of business it is, not which one. */
const COMPANY_WORDS = new Set(['PTY', 'LTD', 'LIMITED', 'CO', 'THE', 'AND', 'INC', 'GROUP']);

/** A name's letter words in capitals, without company words. "Ng & Sons Pty Ltd" gives NG SONS. */
export function nameWords(name: string): string[] {
  return name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w !== '' && !COMPANY_WORDS.has(w));
}

/**
 * Whether one name is the other cut short: the shorter's words begin the longer's, each word the
 * start of the other's ("SMITH RENOV" and "SMITH RENOVATIONS"). The first word must match in full
 * and have three letters or more, so "K Patel" and "K Smith" are never offered.
 */
export function similarNames(a: string, b: string): boolean {
  const [short, long] = [nameWords(a), nameWords(b)].sort((x, y) => x.length - y.length);
  if (short === undefined || long === undefined) return false;
  const first = short[0];
  if (first === undefined || first.length < 3 || first !== long[0]) return false;
  if (short.join(' ') === long.join(' ')) return true;
  return short.every((word, i) => long[i]?.startsWith(word) === true);
}

/** The key a pair is kept under: the two ids in order, so either way round is the same pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

function reasonFor(a: ContactForPairing, b: ContactForPairing): PairReason | null {
  if (a.abn !== null && a.abn === b.abn) return 'same-abn';
  const sharedWords = a.words.some((x) =>
    b.words.some((y) => wordsStartWith(x, y) || wordsStartWith(y, x)),
  );
  if (sharedWords) return 'same-bank-words';
  if (similarNames(a.name, b.name)) return 'similar-names';
  return null;
}

/** Every pair that looks like one contact, except those he chose to keep, strongest reason first. */
export function likelyPairs(
  contacts: readonly ContactForPairing[],
  kept: ReadonlySet<string>,
): LikelyPair[] {
  const order: Record<PairReason, number> = {
    'same-abn': 0,
    'same-bank-words': 1,
    'similar-names': 2,
  };
  const pairs: LikelyPair[] = [];
  contacts.forEach((a, i) => {
    for (const b of contacts.slice(i + 1)) {
      if (kept.has(pairKey(a.id, b.id))) continue;
      const reason = reasonFor(a, b);
      if (reason !== null) pairs.push({ first: a.id, second: b.id, reason });
    }
  });
  return pairs.sort((x, y) => order[x.reason] - order[y.reason]);
}
