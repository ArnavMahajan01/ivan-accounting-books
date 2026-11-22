// Environment variables are outside input, read only here and checked with Zod
// (context/code-standards.md). Only the main process calls loadEnv. Every variable is listed
// in .env.example. Error messages name the variable, never its value, which may be private.

import { z } from 'zod';
import { err, ok, type Result } from './result';

/** The variables the app reads. None yet. Folder 09 adds the Google OAuth client id. */
export const envSchema = z.object({});

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
