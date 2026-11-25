// Reading a statement file from disk, in the main process (spec 062). The screens only ever pass
// a path, and never see the file's text. Everything is checked before the file is read: it must
// be a plain file, and small enough. What the file holds is checked later, by the reader.

import { open, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { MAX_STATEMENT_CHARS } from '@import/index';
import { err, ok, type Result } from '@shared/result';
import type { ImportRefusal } from '@shared/views';

/** A character is at most four bytes, so no file under this can be over the character limit unseen. */
const MAX_FILE_BYTES = MAX_STATEMENT_CHARS * 2;

export interface StatementFile {
  readonly fileName: string;
  readonly text: string;
}

// Westpac's files say CHARSET:1252, and some exports are UTF-8. Try UTF-8, which refuses bytes
// that are not valid, then fall back to Windows-1252 so a stray accented letter is not lost.
function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export async function readStatementFile(
  path: string,
): Promise<Result<StatementFile, ImportRefusal>> {
  try {
    const info = await stat(path);
    if (!info.isFile()) return err('unreadable-file');
    if (info.size === 0) return err('empty');
    if (info.size > MAX_FILE_BYTES) return err('too-large');
    const handle = await open(path, 'r');
    try {
      // Read one byte past the size just checked, so a file that grew meanwhile is still refused.
      const buffer = Buffer.alloc(info.size + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > info.size) return err('too-large');
      return ok({ fileName: basename(path), text: decode(buffer.subarray(0, bytesRead)) });
    } finally {
      await handle.close();
    }
  } catch {
    // A missing file, no permission, a folder: none is worth telling apart to him.
    return err('unreadable-file');
  }
}
