// Stable string ids with a kind prefix, such as `acc_9k2m4q7t1v3x5z8b` (context/code-standards.md, "Ids").
// The random source is passed in, so tests get the same ids every run and pure code never
// reaches for randomness itself. The real source is in src/main/random.ts.

import type { IdKind } from './kinds';

export type Id<K extends IdKind> = `${K}_${string}`;

/** Gives `count` random bytes, each 0 to 255. */
export interface RandomSource {
  bytes(count: number): Uint8Array;
}

// Crockford base32 in lower case: no i, l, o or u, so an id copied by hand is not misread.
// 32 symbols divide 256 exactly, so every symbol is equally likely.
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const ID_LENGTH = 16;

/** A new id such as `acc_` plus 16 random characters (80 bits). */
export function newId<K extends IdKind>(kind: K, random: RandomSource): Id<K> {
  let body = '';
  for (const byte of random.bytes(ID_LENGTH)) {
    body += ALPHABET.charAt(byte % ALPHABET.length);
  }
  return `${kind}_${body}`;
}

/**
 * A repeatable random source for tests and sample data: the same seed gives the same bytes.
 * Not for anything secret. Uses the mulberry32 generator.
 */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    bytes(count) {
      const out = new Uint8Array(count);
      for (let i = 0; i < count; i += 1) {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        out[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff;
      }
      return out;
    },
  };
}
