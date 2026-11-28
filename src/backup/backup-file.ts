// The backup file (spec 136, risk D2): the books, encrypted with AES-256-GCM, after a short header
// in plain text that says what is inside without the key, so the restore list can show it. The
// header is authenticated with the books (GCM's associated data), so it cannot be altered either.
//
//   ACCOUNTING-BOOKS-BACKUP 1\n
//   <header as one line of JSON>\n
//   <12-byte nonce><16-byte tag><encrypted books>

import { createCipheriv, createDecipheriv } from 'node:crypto';
import { z } from 'zod';
import { err, ok, type Result } from '@shared/result';

const MAGIC = 'ACCOUNTING-BOOKS-BACKUP 1\n';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
export const KEY_BYTES = 32;
/** No backup of this app's books comes near this; a bigger file is not one of ours. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024 * 1024;

export const backupHeaderSchema = z
  .object({
    /** When it was made, as an ISO timestamp. */
    createdAt: z.string().max(40),
    appVersion: z.string().max(40),
    schemaVersion: z.number().int().min(1).max(10_000),
    /** How many journal entries the books held, for the restore list. */
    entries: z.number().int().min(0),
    /** Sample books are never restored over his own, nor the other way round. */
    mode: z.enum(['real', 'sample']),
  })
  .strict();

export type BackupHeader = z.infer<typeof backupHeaderSchema>;

export type BackupReadError = 'not-a-backup' | 'damaged' | 'wrong-key';

export function sealBackup(
  books: Buffer,
  header: BackupHeader,
  key: Buffer,
  nonce: Buffer,
): Buffer {
  if (key.length !== KEY_BYTES || nonce.length !== NONCE_BYTES) {
    throw new RangeError('A backup key is 32 bytes and a nonce 12');
  }
  const head = Buffer.from(`${MAGIC}${JSON.stringify(header)}\n`, 'utf8');
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(head);
  const sealed = Buffer.concat([cipher.update(books), cipher.final()]);
  return Buffer.concat([head, nonce, cipher.getAuthTag(), sealed]);
}

/** The header and where the sealed part starts, without the key. */
export function readBackupHeader(
  file: Buffer,
): Result<{ header: BackupHeader; bodyAt: number }, BackupReadError> {
  if (file.length > MAX_BACKUP_BYTES) return err('not-a-backup');
  if (file.subarray(0, MAGIC.length).toString('utf8') !== MAGIC) return err('not-a-backup');
  const end = file.indexOf(0x0a, MAGIC.length);
  if (end === -1 || end - MAGIC.length > 4096) return err('damaged');
  let raw: unknown;
  try {
    raw = JSON.parse(file.subarray(MAGIC.length, end).toString('utf8'));
  } catch {
    return err('damaged');
  }
  const parsed = backupHeaderSchema.safeParse(raw);
  if (!parsed.success) return err('damaged');
  const bodyAt = end + 1;
  if (file.length < bodyAt + NONCE_BYTES + TAG_BYTES) return err('damaged');
  return ok({ header: parsed.data, bodyAt });
}

/** The books inside, or why not. A wrong key and an altered file both fail the GCM check. */
export function openBackup(
  file: Buffer,
  key: Buffer,
): Result<{ header: BackupHeader; books: Buffer }, BackupReadError> {
  const read = readBackupHeader(file);
  if (!read.ok) return read;
  const { header, bodyAt } = read.value;
  const nonce = file.subarray(bodyAt, bodyAt + NONCE_BYTES);
  const tag = file.subarray(bodyAt + NONCE_BYTES, bodyAt + NONCE_BYTES + TAG_BYTES);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(file.subarray(0, bodyAt));
    decipher.setAuthTag(tag);
    const books = Buffer.concat([
      decipher.update(file.subarray(bodyAt + NONCE_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
    return ok({ header, books });
  } catch {
    return err('wrong-key');
  }
}
