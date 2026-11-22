import { describe, expect, expectTypeOf, it } from 'vitest';
import { err, mapResult, ok, type Result } from './result';

function halve(n: number): Result<number, 'odd'> {
  return n % 2 === 0 ? ok(n / 2) : err('odd');
}

describe('Result', () => {
  it('narrows to the value on success', () => {
    const r = halve(10);
    if (r.ok) {
      expectTypeOf(r.value).toEqualTypeOf<number>();
      expect(r.value).toBe(5);
    } else {
      expect.unreachable('10 is even');
    }
  });

  it('narrows to the error on failure', () => {
    const r = halve(3);
    if (!r.ok) {
      expectTypeOf(r.error).toEqualTypeOf<'odd'>();
      expect(r.error).toBe('odd');
    } else {
      expect.unreachable('3 is odd');
    }
  });

  it('builds plain objects', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('bad')).toEqual({ ok: false, error: 'bad' });
  });
});

describe('mapResult', () => {
  it('transforms a success', () => {
    expect(mapResult(halve(8), (n) => `${String(n)} each`)).toEqual(ok('4 each'));
  });

  it('passes a failure through without calling the transform', () => {
    let called = false;
    const r = mapResult(halve(7), (n) => {
      called = true;
      return n;
    });
    expect(r).toEqual(err('odd'));
    expect(called).toBe(false);
  });
});
