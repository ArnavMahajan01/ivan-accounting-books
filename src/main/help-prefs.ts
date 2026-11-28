// Help's stars and tags (spec 134): his own, on this Mac, kept beside the window size and the
// appearance rather than in the books, so loading the sample books never loses them. The file is
// outside input, so it is checked with Zod; anything it cannot trust is ignored.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { MAX_TAG_LENGTH, MAX_TAGS, type HelpPrefs } from '@shared/settings';

export const HELP_PREFS_FILE = 'help-prefs.json';

const guideId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

export const helpPrefsSchema = z
  .object({
    starred: z.array(guideId).max(200),
    tags: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(MAX_TAG_LENGTH),
            guides: z.array(guideId).max(200),
          })
          .strict(),
      )
      .max(MAX_TAGS),
  })
  .strict();

export const NO_HELP_PREFS: HelpPrefs = { starred: [], tags: [] };

export function loadHelpPrefs(dataDir: string): HelpPrefs {
  try {
    const parsed = helpPrefsSchema.safeParse(
      JSON.parse(readFileSync(join(dataDir, HELP_PREFS_FILE), 'utf8')),
    );
    return parsed.success ? parsed.data : NO_HELP_PREFS;
  } catch {
    return NO_HELP_PREFS;
  }
}

export function saveHelpPrefs(dataDir: string, prefs: HelpPrefs): void {
  writeFileSync(join(dataDir, HELP_PREFS_FILE), `${JSON.stringify(prefs)}\n`, { mode: 0o600 });
}
