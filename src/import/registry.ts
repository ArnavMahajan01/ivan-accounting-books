// Picks the reader for a file from what is inside it, never from its name (a file called .csv can
// hold OFX, and the other way round). Each reader added in a later spec is listed here once.

import { err, type Result } from '@shared/result';
import { looksLikeOfx, readOfx } from './ofx';
import type { ParsedStatement, ReadError } from './statement';

interface Reader {
  readonly detect: (text: string) => boolean;
  readonly read: (text: string) => Result<ParsedStatement, ReadError>;
}

// The Westpac CSV reader joins this list when its header row is known (client question 16).
const READERS: readonly Reader[] = [{ detect: looksLikeOfx, read: readOfx }];

/** Reads a statement file's text with whichever reader recognises it. */
export function readStatement(text: string): Result<ParsedStatement, ReadError> {
  const reader = READERS.find((r) => r.detect(text));
  if (reader === undefined) {
    // An empty or oversized file is named as such, whatever it holds.
    return text.trim() === '' ? err({ code: 'empty' }) : err({ code: 'unknown-format' });
  }
  return reader.read(text);
}
