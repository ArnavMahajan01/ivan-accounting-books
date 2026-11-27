// The saved Google sign-in (spec 107, risk G1): the refresh token and the account's email,
// encrypted with Electron's safeStorage (the Mac's Keychain) and kept in one file in the data
// folder. Main process only. The file never holds plain text, and nothing here logs it. Main
// passes the cipher in, because src/google may not import Electron.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { err, ok, type Result } from '@shared/result';

/** What main gives from `safeStorage` (its async calls, as Electron 45 asks). */
export interface TokenCipher {
  isAvailable(): Promise<boolean>;
  encrypt(text: string): Promise<Buffer>;
  /** `reEncrypt`: the Keychain key changed, so the file should be written again. */
  decrypt(data: Buffer): Promise<{ readonly text: string; readonly reEncrypt: boolean }>;
}

export interface SavedSignIn {
  readonly refreshToken: string;
  /** "Connected as …". Null when Google did not say. */
  readonly email: string | null;
}

export interface TokenStore {
  /** Null when there is none, or it cannot be read (then he signs in again). */
  load(): Promise<SavedSignIn | null>;
  save(signIn: SavedSignIn): Promise<Result<void, 'no-keychain'>>;
  clear(): void;
}

const savedSchema = z.object({
  refreshToken: z.string().min(1),
  email: z.string().nullable(),
});

export function fileTokenStore(path: string, cipher: TokenCipher): TokenStore {
  const save = async (signIn: SavedSignIn): Promise<Result<void, 'no-keychain'>> => {
    if (!(await cipher.isAvailable())) return err('no-keychain');
    writeFileSync(path, await cipher.encrypt(JSON.stringify(signIn)), { mode: 0o600 });
    return ok(undefined);
  };
  return {
    async load() {
      if (!existsSync(path) || !(await cipher.isAvailable())) return null;
      try {
        const opened = await cipher.decrypt(readFileSync(path));
        const parsed = savedSchema.safeParse(JSON.parse(opened.text));
        if (!parsed.success) return null;
        if (opened.reEncrypt) await save(parsed.data);
        return parsed.data;
      } catch {
        return null;
      }
    },
    save,
    clear() {
      rmSync(path, { force: true });
    },
  };
}
