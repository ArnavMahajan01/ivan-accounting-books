// The recovery key (spec 136): the backup key written out for him to keep on paper, so a backup
// can be opened on another Mac or after the Keychain is lost. 32 bytes as 52 characters of
// Crockford's base32, in groups of four. Reading it back ignores spaces, dashes and case, and
// takes O as 0 and I or L as 1, the letters people mix up.

import { err, ok, type Result } from '@shared/result';
import { KEY_BYTES } from './backup-file';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const KEY_CHARS = Math.ceil((KEY_BYTES * 8) / 5);

export function recoveryKeyText(key: Buffer): string {
  if (key.length !== KEY_BYTES) throw new RangeError('A backup key is 32 bytes');
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of key) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31] ?? '';
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31] ?? '';
  return (out.match(/.{1,4}/g) ?? []).join('-');
}

export function parseRecoveryKey(text: string): Result<Buffer, 'bad-recovery-key'> {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (clean.length !== KEY_CHARS) return err('bad-recovery-key');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const digit = ALPHABET.indexOf(ch);
    if (digit === -1) return err('bad-recovery-key');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return bytes.length === KEY_BYTES ? ok(Buffer.from(bytes)) : err('bad-recovery-key');
}
