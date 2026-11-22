import { describe, expect, it } from 'vitest';
import { newId } from '@shared/ids';
import { systemRandom } from './random';

describe('systemRandom', () => {
  it('gives the requested number of bytes, different each time', () => {
    expect(systemRandom.bytes(16)).toHaveLength(16);
    expect(newId('acc', systemRandom)).not.toBe(newId('acc', systemRandom));
  });
});
