// The folder the Admin Dashboard writes invoices to (spec 127; W08a, Option 2), linked once in
// Settings. Kept with the other choices in `app_meta`. The main process reads the folder; this
// only remembers which one, and merges what is in it into one file for the same preview.

import { getAppMeta, setAppMeta } from '@data/app-meta-repository';
import type { ReadContext } from './context';

export const INVOICE_FOLDER_KEY = 'invoice_folder';

export function linkedInvoiceFolder(ctx: ReadContext): string | null {
  const folder = getAppMeta(ctx.db, INVOICE_FOLDER_KEY);
  return folder === null || folder === '' ? null : folder;
}

export function setInvoiceFolder(ctx: ReadContext, folder: string | null): void {
  setAppMeta(ctx.db, INVOICE_FOLDER_KEY, folder ?? '');
}

/**
 * Several exchange files as one, so everything waiting in the folder is previewed and added in one
 * go. A file that is not one is left out and counted; the reader checks the rest as usual.
 */
export function mergeExchangeFiles(texts: readonly string[]): { text: string; unreadable: number } {
  const documents: unknown[] = [];
  let unreadable = 0;
  let header: Record<string, unknown> | null = null;
  for (const text of texts) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('documents' in parsed) ||
        !Array.isArray(parsed.documents)
      ) {
        unreadable += 1;
        continue;
      }
      header ??= { ...(parsed as Record<string, unknown>) };
      documents.push(...(parsed.documents as unknown[]));
    } catch {
      unreadable += 1;
    }
  }
  // The same number and version can be in two files (the Admin Dashboard writes each again): once.
  const seen = new Set<string>();
  const unique = documents.filter((d) => {
    const key =
      typeof d === 'object' && d !== null && 'number' in d && 'version' in d
        ? `${String(d.number)}#${String(d.version)}`
        : null;
    if (key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { text: JSON.stringify({ ...(header ?? {}), documents: unique }), unreadable };
}
