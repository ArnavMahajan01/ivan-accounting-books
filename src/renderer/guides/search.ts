import { type Guide } from '@shared/guide';

/** Everything a person can read in a guide, in one lower-case string. */
function guideText(guide: Guide): string {
  return [
    guide.title,
    guide.group,
    guide.summary,
    ...guide.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...section.steps.flatMap((step) => [step.text, step.image?.description ?? '']),
    ]),
  ]
    .join('\n')
    .toLowerCase();
}

/** Guides that contain every word of the query, anywhere in their text. No query finds them all. */
export function searchGuides(guides: readonly Guide[], query: string): Guide[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== '');
  if (words.length === 0) return [...guides];
  return guides.filter((guide) => {
    const text = guideText(guide);
    return words.every((word) => text.includes(word));
  });
}
