import { describe, expect, it } from 'vitest';
import { newId, seededRandom } from './ids';
import { ID_KINDS } from './kinds';

describe('newId', () => {
  it('gives the kind prefix and 16 Crockford base32 characters', () => {
    for (const kind of ID_KINDS) {
      expect(newId(kind, seededRandom(1))).toMatch(new RegExp(`^${kind}_[0-9a-hjkmnp-tv-z]{16}$`));
    }
  });

  it('is repeatable with the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = [newId('acc', a), newId('ent', a), newId('lin', a)];
    expect([newId('acc', b), newId('ent', b), newId('lin', b)]).toEqual(first);
  });

  it('gives different ids from one source, and from different seeds', () => {
    const random = seededRandom(7);
    const ids = new Set(Array.from({ length: 10_000 }, () => newId('lin', random)));
    expect(ids.size).toBe(10_000);
    expect(newId('acc', seededRandom(1))).not.toBe(newId('acc', seededRandom(2)));
  });

  it('uses every symbol evenly over many bytes', () => {
    const counts = new Map<string, number>();
    const random = seededRandom(3);
    for (let i = 0; i < 2000; i += 1) {
      for (const ch of newId('acc', random).slice(4)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).toBe(32);
    // 32,000 characters over 32 symbols is about 1,000 each.
    for (const n of counts.values()) expect(n).toBeGreaterThan(850);
  });
});
