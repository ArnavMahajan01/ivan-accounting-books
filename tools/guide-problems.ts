// Checks the guides in a folder (spec 027): each file is valid JSON that passes the guide schema,
// is named after its id, and every image it names exists and is small enough. Returns one
// readable line per problem, never the guide text.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { guideImages, guideSchema, MAX_IMAGE_BYTES } from '@shared/guide';

export function findGuideProblems(guidesDir: string): string[] {
  const problems: string[] = [];
  const files = readdirSync(guidesDir).filter((name) => name.endsWith('.json'));
  const seenIds = new Set<string>();
  for (const name of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(guidesDir, name), 'utf8'));
    } catch {
      problems.push(`${name}: not valid JSON`);
      continue;
    }
    const parsed = guideSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push(`${name}: ${issue.path.join('.') || 'guide'}: ${issue.message}`);
      }
      continue;
    }
    const guide = parsed.data;
    if (`${guide.id}.json` !== name)
      problems.push(`${name}: the id "${guide.id}" must match the file name`);
    if (seenIds.has(guide.id)) problems.push(`${name}: the id "${guide.id}" is used twice`);
    seenIds.add(guide.id);
    for (const image of guideImages(guide)) {
      const path = join(guidesDir, 'images', image.file);
      if (!existsSync(path)) {
        problems.push(`${name}: the image ${image.file} does not exist in images/`);
      } else if (statSync(path).size > MAX_IMAGE_BYTES) {
        problems.push(
          `${name}: the image ${image.file} is over ${String(MAX_IMAGE_BYTES / 1024)} KB`,
        );
      }
    }
  }
  return problems;
}
