import { describe, expect, it } from 'vitest';
import * as viaAlias from '@shared/index';
import * as viaRelative from './index';

// Guards the path alias set-up in tsconfig.json, which Vitest reads through Vite's tsconfigPaths.
describe('path aliases', () => {
  it('resolves @shared to src/shared', () => {
    expect(viaAlias).toBe(viaRelative);
  });
});
