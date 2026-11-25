// Previews waiting to be confirmed, held in memory only (spec 063). A preview is a file that has
// been read and checked but not saved, so it holds lines of his statement: it is never written to
// disk, is forgotten when the books change or the app quits, and only the last few are kept.

import type { PreparedImport } from '@services/import-file';
import { newId, type RandomSource } from '@shared/ids';

const KEEP = 5;

export interface PreviewStore {
  put(prepared: PreparedImport): string;
  /** The preview, or undefined if it was never made, was used, or was forgotten. Does not remove it. */
  get(id: string): PreparedImport | undefined;
  remove(id: string): void;
  clear(): void;
}

export function createPreviewStore(random: RandomSource): PreviewStore {
  const held = new Map<string, PreparedImport>();
  return {
    put(prepared) {
      const id = newId('pre', random);
      held.set(id, prepared);
      for (const oldest of [...held.keys()].slice(0, Math.max(0, held.size - KEEP))) {
        held.delete(oldest);
      }
      return id;
    },
    get: (id) => held.get(id),
    remove(id) {
      held.delete(id);
    },
    clear() {
      held.clear();
    },
  };
}
