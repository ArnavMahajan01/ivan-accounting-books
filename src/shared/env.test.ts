import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadEnv, parseEnv } from './env';

const sample = z.object({
  SAMPLE_CLIENT_ID: z.string().min(1),
  SAMPLE_PORT: z.string().regex(/^\d+$/).optional(),
});

describe('parseEnv', () => {
  it('returns the checked values', () => {
    expect(parseEnv(sample, { SAMPLE_CLIENT_ID: 'abc', SAMPLE_PORT: '8080', OTHER: 'x' })).toEqual({
      ok: true,
      value: { SAMPLE_CLIENT_ID: 'abc', SAMPLE_PORT: '8080' },
    });
  });

  it('names a missing variable', () => {
    expect(parseEnv(sample, {})).toEqual({
      ok: false,
      error: {
        code: 'invalid-env',
        problems: [{ variable: 'SAMPLE_CLIENT_ID', problem: 'missing' }],
      },
    });
  });

  it('names an invalid variable, without its value', () => {
    const r = parseEnv(sample, { SAMPLE_CLIENT_ID: 'abc', SAMPLE_PORT: 'secret-ish' });
    expect(r).toEqual({
      ok: false,
      error: { code: 'invalid-env', problems: [{ variable: 'SAMPLE_PORT', problem: 'invalid' }] },
    });
    expect(JSON.stringify(r)).not.toContain('secret-ish');
  });
});

describe('loadEnv', () => {
  it('accepts the current environment, which needs no variables yet', () => {
    expect(loadEnv({}).ok).toBe(true);
    expect(loadEnv().ok).toBe(true);
  });
});
