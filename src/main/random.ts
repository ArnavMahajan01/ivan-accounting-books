// The real random source. It lives in the main process, not in src/shared, so pure code
// cannot reach it and has to be given a RandomSource instead.

import { getRandomValues } from 'node:crypto';
import type { RandomSource } from '@shared/ids';

export const systemRandom: RandomSource = {
  bytes(count) {
    return getRandomValues(new Uint8Array(count));
  },
};
