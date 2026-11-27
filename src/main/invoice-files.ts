// Reading an invoice exchange file from disk, in the main process (spec 126). The screens never see
// the file's text or the folder. It must be a plain file, small enough, and UTF-8; what it holds is
// checked by the reader in src/import/invoice-exchange.ts.

import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { MAX_EXCHANGE_BYTES } from '@import/invoice-exchange';
import { err, ok, type Result } from '@shared/result';

export interface InvoiceFile {
  readonly fileName: string;
  readonly text: string;
}

export type InvoiceFileRefusal = 'unreadable-file' | 'too-large' | 'empty';

export async function readInvoiceFile(
  path: string,
): Promise<Result<InvoiceFile, InvoiceFileRefusal>> {
  try {
    const info = await stat(path);
    if (!info.isFile()) return err('unreadable-file');
    if (info.size === 0) return err('empty');
    if (info.size > MAX_EXCHANGE_BYTES) return err('too-large');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path));
    return ok({ fileName: basename(path), text });
  } catch {
    return err('unreadable-file');
  }
}

/** The exchange files in the linked folder (spec 127): `.json` files only, by name. Null if unreadable. */
export async function listInvoiceFiles(folder: string): Promise<string[] | null> {
  try {
    const names = await readdir(folder);
    return names
      .filter((n) => n.toLowerCase().endsWith('.json') && !n.startsWith('.'))
      .sort()
      .map((n) => join(folder, n));
  } catch {
    return null;
  }
}
