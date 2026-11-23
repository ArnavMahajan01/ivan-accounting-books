// The guides ship inside the app: the build bundles every file in `guides/`, so Help works
// offline and the screens never read a file.

import { GUIDE_GROUPS, guideSchema, type Guide } from '@shared/guide';

/**
 * Keeps the guides that pass the schema, in Help's order: by group, then by title.
 * `tools/guide-problems.test.ts` fails the checks if any guide in `guides/` is invalid, so a
 * guide skipped here cannot reach the client.
 */
export function parseGuides(raw: readonly unknown[]): Guide[] {
  return raw
    .flatMap((value) => {
      const parsed = guideSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    .sort(
      (a, b) =>
        GUIDE_GROUPS.indexOf(a.group) - GUIDE_GROUPS.indexOf(b.group) ||
        a.title.localeCompare(b.title),
    );
}

const guideFiles = import.meta.glob<unknown>('../../../guides/*.json', {
  eager: true,
  import: 'default',
});
const imageFiles = import.meta.glob<string>('../../../guides/images/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

export const GUIDES: readonly Guide[] = parseGuides(Object.values(guideFiles));

/** The address of a guide image, by its file name in `guides/images/`. */
export function guideImageUrl(file: string): string | undefined {
  return imageFiles[`../../../guides/images/${file}`];
}
