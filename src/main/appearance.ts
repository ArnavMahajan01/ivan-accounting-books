// Settings, Appearance (spec 133): the same as the Mac, light or dark. A choice about this Mac, not
// about one set of books, so it is kept beside the window's size, not in the books, and loading the
// sample books never changes it. The file is outside input, so it is checked with Zod.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { APPEARANCES, type Appearance } from '@shared/settings';

export const APPEARANCE_FILE = 'appearance.json';

const fileSchema = z.object({ appearance: z.enum(APPEARANCES) });

export function loadAppearance(dataDir: string): Appearance {
  try {
    const parsed = fileSchema.safeParse(
      JSON.parse(readFileSync(join(dataDir, APPEARANCE_FILE), 'utf8')),
    );
    return parsed.success ? parsed.data.appearance : 'system';
  } catch {
    return 'system';
  }
}

export function saveAppearance(dataDir: string, appearance: Appearance): void {
  writeFileSync(join(dataDir, APPEARANCE_FILE), `${JSON.stringify({ appearance })}\n`, {
    mode: 0o600,
  });
}
