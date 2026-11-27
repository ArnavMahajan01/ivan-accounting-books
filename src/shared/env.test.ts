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
  it('needs no variable: Google is then "not set up"', () => {
    expect(loadEnv({}).ok).toBe(true);
    // As copied from .env.example, every value empty.
    expect(
      loadEnv({
        MAIN_VITE_GOOGLE_CLIENT_ID: '',
        MAIN_VITE_GOOGLE_CLIENT_SECRET: '',
        GOOGLE_FAKE: '',
      }),
    ).toEqual({ ok: true, value: {} });
  });

  it('reads the Google client id, and refuses one that is not a Google client id', () => {
    expect(
      loadEnv({
        MAIN_VITE_GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com',
        GOOGLE_FAKE: '1',
      }),
    ).toEqual({
      ok: true,
      value: { MAIN_VITE_GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com', GOOGLE_FAKE: '1' },
    });
    expect(loadEnv({ MAIN_VITE_GOOGLE_CLIENT_ID: 'https://example.com' })).toEqual({
      ok: false,
      error: {
        code: 'invalid-env',
        problems: [{ variable: 'MAIN_VITE_GOOGLE_CLIENT_ID', problem: 'invalid' }],
      },
    });
  });
});
