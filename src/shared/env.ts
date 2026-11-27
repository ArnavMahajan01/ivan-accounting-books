// Environment variables are outside input, read only here and checked with Zod
// (context/code-standards.md). Only the main process calls loadEnv. Every variable is listed
// in .env.example. Error messages name the variable, never its value, which may be private.

import { z } from 'zod';
import { err, ok, type Result } from './result';

/** A variable left empty, as `.env.example` has them, counts as not set. */
function unlessEmpty<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

/**
 * The variables the app reads. The Google ones come from `.env` at build time (electron-vite puts
 * `MAIN_VITE_` variables into the main process build), so the packaged app has them too. Without a
 * client id, Google shows as "not set up" (spec 106). A desktop client's id and secret are not
 * private: Google treats a desktop app as a public client that cannot keep a secret, and the
 * sign-in is protected by PKCE instead. `GOOGLE_FAKE` is read at run time, and only by an
 * unpackaged build: it swaps Google for the in-memory one in `src/google/fake-google.ts`.
 */
export const envSchema = z.object({
  MAIN_VITE_GOOGLE_CLIENT_ID: unlessEmpty(
    z.string().regex(/^[\w.-]+\.apps\.googleusercontent\.com$/),
  ),
  MAIN_VITE_GOOGLE_CLIENT_SECRET: unlessEmpty(z.string().regex(/^[\w-]{10,100}$/)),
  GOOGLE_FAKE: unlessEmpty(z.literal('1')),
});

export type Env = z.infer<typeof envSchema>;

export interface EnvProblem {
  readonly variable: string;
  readonly problem: 'missing' | 'invalid';
}

export interface EnvError {
  readonly code: 'invalid-env';
  readonly problems: readonly EnvProblem[];
}

/** Checks `source` against `schema`. Separate from loadEnv so tests can use their own schema. */
export function parseEnv<S extends z.ZodObject>(
  schema: S,
  source: Readonly<Record<string, string | undefined>>,
): Result<z.infer<S>, EnvError> {
  const parsed = schema.safeParse(source);
  if (parsed.success) return ok(parsed.data);
  return err({
    code: 'invalid-env',
    problems: parsed.error.issues.map((issue) => ({
      variable: issue.path.map(String).join('.'),
      problem: issue.code === 'invalid_type' && issue.input === undefined ? 'missing' : 'invalid',
    })),
  });
}

export function loadEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): Result<Env, EnvError> {
  return parseEnv(envSchema, source);
}
